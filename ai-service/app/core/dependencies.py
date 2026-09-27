from typing import Annotated
from fastapi import Depends, Header
from app.core.config import Settings, get_settings
from app.core.security import kiem_tra_internal_token

def lay_settings() -> Settings:
    return get_settings()

def xac_thuc_internal(
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
    settings: Settings = Depends(lay_settings)
) -> bool:
    kiem_tra_internal_token(x_internal_token, settings)
    return True

SettingsDependency = Annotated[Settings, Depends(lay_settings)]
InternalAuthDependency = Annotated[bool, Depends(xac_thuc_internal)]