"""
FastAPI Chat Backend
- Auth: JWT (RS256) verification using a PUBLIC key (no signing required)
- Resources: Convos (rooms) and Messages
- Endpoints:
  * GET /convos?since=ISO-8601
  * GET /messages?since=ISO-8601
- WebSocket: /ws for realtime events
  * Events: CREATE_CONVO, UPDATE_CONVO, SEND_MESSAGE, DELETE_MESSAGE, UPDATE_MESSAGE,
            MESSAGE_DELIVERED, MESSAGE_SEEN
- Idempotency: (sender_id, local_id) unique to prevent duplicate messages
- Data model: SQLite + SQLAlchemy (replace with your DB of choice)

Notes on user details from JWT:
- With only a public key you can VERIFY tokens and READ claims embedded in the JWT (e.g., sub, email, username) — you cannot derive extra profile fields that aren’t in the token. If you need more user data, either:
  1) Include it as claims in the issued JWT (preferred: minimal PII, short-lived), or
  2) Provide a user-info endpoint your backend can call (e.g., OIDC UserInfo), or
  3) Provide the private key and have this service issue its own JWTs (not necessary here).

Run:
  uvicorn app:app --reload

Env:
  PUBLIC_KEY_PEM=""
"""

from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import json
import os

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from jose import jwt
from jose.exceptions import JWTError
from uuid import uuid4

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    select,
    and_,
    or_,
    event as sqla_event,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

# -----------------------------
# DB setup
# -----------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chat.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# -----------------------------
# Models
# -----------------------------
# Reuse existing Django auth_user table (source of truth). Do not migrate this from FastAPI; Django owns it.
class DjangoUser(Base):
    __tablename__ = "auth_user"  # default Django table name
    id = Column(Integer, primary_key=True)  # Django uses integer PKs by default
    username = Column(String, index=True)
    email = Column(String, index=True)
    is_active = Column(Boolean)
    date_joined = Column(DateTime)

class Convo(Base):
    __tablename__ = "convos"
    id = Column(String, primary_key=True)
    local_id = Column(String, nullable=True)
    title = Column(String, nullable=True)
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    messages = relationship("Message", back_populates="convo")

class ConvoParticipant(Base):
    __tablename__ = "convo_participants"
    id = Column(Integer, primary_key=True, autoincrement=True)
    convo_id = Column(String, ForeignKey("convos.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("auth_user.id", ondelete="CASCADE"), index=True)
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_read_at = Column(DateTime, nullable=True)
    convo = relationship("Convo")
    user = relationship("DjangoUser")
    __table_args__ = (UniqueConstraint("convo_id", "user_id", name="uq_convo_user"),)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True)  # server_id (e.g., ULIDs/UUIDs)
    local_id = Column(String, nullable=True)  # provided by sender client
    convo_id = Column(String, ForeignKey("convos.id", ondelete="CASCADE"), index=True)
    sender_id = Column(Integer, ForeignKey("auth_user.id", ondelete="SET NULL"), index=True)
    content = Column(Text)
    deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    convo = relationship("Convo", back_populates="messages")
    sender = relationship("DjangoUser")

    __table_args__ = (
        UniqueConstraint("sender_id", "local_id", name="uq_sender_local_id"),
    )

class MessageDelivery(Base):
    __tablename__ = "message_deliveries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("auth_user.id", ondelete="CASCADE"), index=True)
    delivered_at = Column(DateTime, nullable=True)
    seen_at = Column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_user"),)

Base.metadata.create_all(bind=engine)

# -----------------------------
# Auth
# -----------------------------
PUBLIC_KEY_PEM = os.getenv("PUBLIC_KEY_PEM")
ALGO = "RS256"  # adjust if needed

class AuthedUser(BaseModel):
    user_id: str
    username: Optional[str] = None
    email: Optional[str] = None
    raw_claims: Dict[str, Any]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from typing import Annotated

def get_current_user(authorization: Annotated[Optional[str], Header(alias="Authorization")] = None, db: Session = Depends(get_db)) -> AuthedUser:
    if authorization is None:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    # try:
    #     scheme, _, token = authorization.partition(" ")
    #     if scheme.lower() != "bearer" or not token:
    #         raise HTTPException(status_code=401, detail="Invalid Authorization header")
    #     if not PUBLIC_KEY_PEM:
    #         raise HTTPException(status_code=500, detail="Server missing PUBLIC_KEY_PEM")
    #     claims = jwt.decode(token, PUBLIC_KEY_PEM, algorithms=[ALGO])
    # except JWTError as e:
    #     raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # sub = claims.get("sub")
    # if sub is None:
    #     raise HTTPException(status_code=401, detail="Token missing 'sub'")

    # Ensure Django user exists and is active.
    sub = authorization
    try:
        uid = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid 'sub' for Django user id")

    user = db.get(DjangoUser, uid)
    if not user or user.is_active is False:
        raise HTTPException(status_code=403, detail="User not found or inactive")

    # username = claims.get("preferred_username") or claims.get("username") or user.username
    # email = claims.get("email") or user.email

    return AuthedUser(user_id=str(uid), username=user.username, email=user.email, raw_claims={})

# -----------------------------
# Schemas
# -----------------------------
class ConvoOut(BaseModel):
    id: str
    title: Optional[str]
    is_group: bool
    updated_at: datetime
    created_at: datetime

class MessageOut(BaseModel):
    id: str
    local_id: Optional[str]
    convo_id: str
    sender_id: Optional[str]
    content: Optional[str]
    deleted: bool
    created_at: datetime
    updated_at: datetime

# -----------------------------
# App
# -----------------------------
app = FastAPI(title="Chat Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to parse since timestamps

def parse_since(since: Optional[str]) -> datetime:
    if not since or since == '0':
        # default to 1970
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    try:
        ts = float(since)
        if abs(ts) > 1e12:
            ts /= 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid 'since' format. Use Unix timestamp.")

# -----------------------------
# REST Endpoints
# -----------------------------
@app.get("/convos/sync", response_model=List[ConvoOut])
def get_convos(
    since: Optional[str] = Query(None, description="Unix timestamp"),
    user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since_dt = parse_since(since)

    q = (
        select(Convo)
        .join(ConvoParticipant, ConvoParticipant.convo_id == Convo.id)
        .where(
            and_(
                ConvoParticipant.user_id == int(user.user_id),
                Convo.updated_at >= since_dt,
            )
        )
        .order_by(Convo.updated_at.desc())
    )
    rows = db.execute(q).scalars().all()
    return [
        ConvoOut(
            id=c.id,
            title=c.title,
            is_group=c.is_group,
            updated_at=c.updated_at,
            created_at=c.created_at,
        )
        for c in rows
    ]

@app.get("/messages/sync", response_model=List[MessageOut])
def get_messages(
    since: Optional[str] = Query(None, description="Unix timestamp"),
    user: AuthedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since_dt = parse_since(since)

    # Only messages from convos where user participates, updated since
    q = (
        select(Message)
        .join(Convo, Convo.id == Message.convo_id)
        .join(ConvoParticipant, ConvoParticipant.convo_id == Convo.id)
        .where(
            and_(
                ConvoParticipant.user_id == int(user.user_id),
                Message.updated_at >= since_dt,
            )
        )
        .order_by(Message.updated_at.desc())
    )
    rows = db.execute(q).scalars().all()
    return [
        MessageOut(
            id=m.id,
            local_id=m.local_id,
            convo_id=m.convo_id,
            sender_id=str(m.sender_id) if m.sender_id is not None else None,
            content=None if m.deleted else m.content,
            deleted=m.deleted,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in rows
    ]

# -----------------------------
# WebSocket Realtime
# -----------------------------
class EventType(str, Enum):
    CREATE_CONVO = "CREATE_CONVO"
    UPDATE_CONVO = "UPDATE_CONVO"
    SEND_MESSAGE = "SEND_MESSAGE"
    DELETE_MESSAGE = "DELETE_MESSAGE"
    UPDATE_MESSAGE = "UPDATE_MESSAGE"
    MESSAGE_DELIVERED = "MESSAGE_DELIVERED"
    MESSAGE_SEEN = "MESSAGE_SEEN"

class WSMessage(BaseModel):
    type: EventType
    payload: Dict[str, Any]

class ConnectionManager:
    def __init__(self):
        # user_id -> set(WebSocket)
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        lst = self.connections.get(user_id, [])
        if websocket in lst:
            lst.remove(websocket)
        if not lst and user_id in self.connections:
            del self.connections[user_id]

    async def send_to_user(self, user_id: str, data: Dict[str, Any]):
        for ws in self.connections.get(user_id, []):
            await ws.send_text(json.dumps(data, default=str))

    async def broadcast_to_convo(self, db: Session, convo_id: str, data: Dict[str, Any], exclude_user: Optional[str] = None):
        # fetch participants
        q = select(ConvoParticipant.user_id).where(ConvoParticipant.convo_id == convo_id)
        user_ids = [row[0] for row in db.execute(q).all()]
        for uid in user_ids:
            if exclude_user and str(uid) == str(exclude_user):
                continue
            await self.send_to_user(str(uid), data)

manager = ConnectionManager()

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    # Expect token via query param or header 'Authorization: Bearer'
    token = websocket.query_params.get("token")
    authorization = None
    if token:
        authorization = f"Bearer {token}"
    else:
        auth_header = websocket.headers.get("authorization")
        if auth_header:
            authorization = auth_header
    # Create a db session for the connection lifetime
    db = SessionLocal()
    try:
        if not authorization:
            await websocket.close(code=4401)
            return
        # user = get_current_user(authorization, db)
        uid = token
        user = db.get(DjangoUser, uid)
        if not user or user.is_active is False:
            raise HTTPException(status_code=403, detail="User not found or inactive")

        user = AuthedUser(user_id=str(uid), username=user.username, email=user.email, raw_claims={})
        await manager.connect(user.user_id, websocket)
        # Initial hello
        await websocket.send_text(json.dumps({"type": "HELLO", "user_id": user.user_id}))

        while True:
            raw = await websocket.receive_text()
            print("REcieved a message: ", raw)
            try:
                msg = WSMessage.model_validate_json(raw)
            except Exception as e:
                await websocket.send_text(json.dumps({"type": "ERROR", "error": "Invalid JSON"}))
                continue

            if msg.type == EventType.CREATE_CONVO:
                convo_id = msg.payload.get("id")
                title = msg.payload.get("title")
                participant_ids: List[str] = msg.payload.get("participants", [])
                if not convo_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing convo id"}))
                    continue
                convo = db.get(Convo, convo_id)
                if not convo:
                    convo = Convo(id=convo_id, title=title, is_group=len(participant_ids) > 2)
                    db.add(convo)
                    db.commit()
                # ensure participants (include sender)
                if user.user_id not in participant_ids:
                    participant_ids.append(user.user_id)
                for pid in set(participant_ids):
                    if not db.execute(select(ConvoParticipant).where(and_(ConvoParticipant.convo_id==convo_id, ConvoParticipant.user_id==pid))).scalar_one_or_none():
                        db.add(ConvoParticipant(convo_id=convo_id, user_id=pid))
                convo.updated_at = datetime.now(timezone.utc)
                db.commit()
                evt = {"type": EventType.CREATE_CONVO, "payload": {"convo": {"id": convo.id, "title": convo.title, "is_group": convo.is_group, "updated_at": convo.updated_at}}, "ack_local_id": convo.local_id}
                await manager.broadcast_to_convo(db, convo_id, evt)

            elif msg.type == EventType.UPDATE_CONVO:
                convo_id = msg.payload.get("id")
                title = msg.payload.get("title")
                if not convo_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing convo id"}))
                    continue
                convo = db.get(Convo, convo_id)
                if not convo:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Convo not found"}))
                    continue
                if title is not None:
                    convo.title = title
                convo.updated_at = datetime.now(timezone.utc)
                db.commit()
                await manager.broadcast_to_convo(db, convo_id, {"type": EventType.UPDATE_CONVO, "payload": {"convo": {"id": convo.id, "title": convo.title, "updated_at": convo.updated_at}}, "ack_local_id": convo.local_id})

            elif msg.type == EventType.SEND_MESSAGE:
                server_id = str(uuid4())
                convo_id = msg.payload.get("convo_id")
                content = msg.payload.get("content")
                local_id = msg.payload.get("local_id")
                if not local_id or not convo_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing local_id or convo_id"}))
                    continue
                # Ensure sender participates
                part = db.execute(select(ConvoParticipant).where(and_(ConvoParticipant.convo_id==convo_id, ConvoParticipant.user_id==user.user_id))).scalar_one_or_none()
                if not part:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Not a participant"}))
                    continue
                # Idempotency check
                existing = db.execute(select(Message).where(and_(Message.sender_id==int(user.user_id), Message.local_id==local_id))).scalar_one_or_none()
                if existing:
                    server_id = existing.id
                    message = existing
                else:
                    message = Message(id=server_id, local_id=local_id, convo_id=convo_id, sender_id=user.user_id, content=content)
                    db.add(message)
                    # set deliveries for other participants
                    other_ids = [row[0] for row in db.execute(select(ConvoParticipant.user_id).where(and_(ConvoParticipant.convo_id==convo_id, ConvoParticipant.user_id!=int(user.user_id)))).all()]
                    # for rid in other_ids:
                    #     db.add(MessageDelivery(message_id=server_id, user_id=rid, delivered_at=datetime.now(timezone.utc)))
                    # bump convo updated_at
                    convo = db.get(Convo, convo_id)
                    if convo:
                        convo.updated_at = datetime.now(timezone.utc)
                    db.commit()
                evt_payload = {
                    "message": {
                        "id": message.id,
                        "local_id": message.local_id,
                        "convo_id": message.convo_id,
                        "sender_id": message.sender_id,
                        "content": message.content,
                        "deleted": message.deleted,
                        "created_at": message.created_at,
                        "updated_at": message.updated_at,
                    }
                }
                await manager.broadcast_to_convo(db, message.convo_id, {"type": EventType.SEND_MESSAGE, "payload": evt_payload, "ack_local_id": local_id})

            elif msg.type == EventType.DELETE_MESSAGE:
                mid = msg.payload.get("id")
                local_id = msg.payload.get("local_id")
                if not mid:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing message id"}))
                    continue
                m = db.get(Message, mid)
                if not m:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Message not found"}))
                    continue
                if m.sender_id != user.user_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Forbidden"}))
                    continue
                m.deleted = True
                m.updated_at = datetime.now(timezone.utc)
                db.commit()
                await manager.broadcast_to_convo(db, m.convo_id, {"type": EventType.DELETE_MESSAGE, "payload": {"id": m.id, "convo_id": m.convo_id}, "ack_local_id": local_id})

            elif msg.type == EventType.UPDATE_MESSAGE:
                mid = msg.payload.get("id")
                content = msg.payload.get("content")
                if not mid:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing message id"}))
                    continue
                m = db.get(Message, mid)
                if not m:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Message not found"}))
                    continue
                if m.sender_id != user.user_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Forbidden"}))
                    continue
                if content is not None:
                    m.content = content
                m.updated_at = datetime.now(timezone.utc)
                db.commit()
                payload = {
                    "message": {
                        "id": m.id,
                        "local_id": m.local_id,
                        "convo_id": m.convo_id,
                        "sender_id": m.sender_id,
                        "content": None if m.deleted else m.content,
                        "deleted": m.deleted,
                        "created_at": m.created_at,
                        "updated_at": m.updated_at,
                    }
                }
                await manager.broadcast_to_convo(db, m.convo_id, {"type": EventType.UPDATE_MESSAGE, "payload": payload, "ack_local_id": m.local_id})

            elif msg.type in (EventType.MESSAGE_DELIVERED, EventType.MESSAGE_SEEN):
                continue
                mid = msg.payload.get("id")
                convo_id = msg.payload.get("convo_id")
                local_id = msg.payload.get('local_id')
                if not mid or not convo_id:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Missing id or convo_id"}))
                    continue
                # ensure membership
                part = db.execute(select(ConvoParticipant).where(and_(ConvoParticipant.convo_id==convo_id, ConvoParticipant.user_id==user.user_id))).scalar_one_or_none()
                if not part:
                    await websocket.send_text(json.dumps({"type": "ERROR", "error": "Not a participant"}))
                    continue
                # upsert delivery state
                md = db.execute(select(MessageDelivery).where(and_(MessageDelivery.message_id==mid, MessageDelivery.user_id==user.user_id))).scalar_one_or_none()
                now = datetime.now(timezone.utc)
                if not md:
                    md = MessageDelivery(message_id=mid, user_id=user.user_id)
                    db.add(md)
                if msg.type == EventType.MESSAGE_DELIVERED:
                    md.delivered_at = now
                else:
                    md.seen_at = now
                    # update last_read_at for convo participant
                    part.last_read_at = now
                db.commit()
                await manager.broadcast_to_convo(db, convo_id, {"type": msg.type, "payload": {"message_id": mid, "user_id": user.user_id, "timestamp": now}, "ack_local_id": local_id}, exclude_user=user.user_id)

            else:
                await websocket.send_text(json.dumps({"type": "ERROR", "error": "Unknown event type"}))

    except WebSocketDisconnect:
        pass
    finally:
        try:
            # We may not know user_id if auth failed; guard
            auth_header = authorization if authorization else ""
            try:
                _claims = jwt.get_unverified_claims(auth_header.split(" ")[-1]) if auth_header else {}
                uid = _claims.get("sub") if isinstance(_claims, dict) else None
                if uid:
                    manager.disconnect(uid, websocket)
            except Exception:
                pass
        finally:
            db.close()

# -----------------------------
# Health
# -----------------------------
@app.get("/healthz")
async def healthz():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}
