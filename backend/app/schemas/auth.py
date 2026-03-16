"""Schemas for auth API."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Login request body."""

    username: str
    password: str


class LoginResponse(BaseModel):
    """Login success response."""

    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Register request body."""

    username: str
    password: str


class RegisterResponse(BaseModel):
    """Register success response."""

    message: str = "User created"
