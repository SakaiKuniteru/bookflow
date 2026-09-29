from __future__ import annotations
from typing import Any
from botocore.exceptions import ClientError
from app.core.config import Settings
class StorageClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: Any | None = None
        self._client_context: Any | None = None
        self._session: Any | None = None
    def san_sang(self) -> bool:
        return self.client is not None
    async def khoi_tao(self) -> None:
        if not self.settings.storage_endpoint:
            return
        from aiobotocore.session import get_session
        self._session = get_session()
        self._client_context = self._session.create_client(
            "s3",
            endpoint_url=self.settings.storage_endpoint,
            aws_access_key_id=self.settings.storage_access_key,
            aws_secret_access_key=self.settings.storage_secret_key,
            region_name="us-east-1",
        )
        self.client = await self._client_context.__aenter__()
        bucket = self.settings.storage_bucket
        try:
            await self.client.head_bucket(Bucket=bucket)
            return
        except ClientError as exc:
            error = exc.response.get("Error", {})
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if error.get("Code") not in {"404", "NoSuchBucket", "NotFound"} and status != 404:
                raise
        try:
            await self.client.create_bucket(Bucket=bucket)
        except ClientError as exc:
            error = exc.response.get("Error", {})
            if error.get("Code") not in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
                raise
            await self.client.head_bucket(Bucket=bucket)
    async def kiem_tra_ket_noi(self) -> bool:
        if self.client is None:
            return False
        try:
            await self.client.list_buckets()
            return True
        except Exception:
            return False
    async def upload_bytes(self, key: str, content: bytes, content_type: str | None = None) -> None:
        if self.client is None:
            raise RuntimeError("Storage chưa được khởi tạo.")
        params: dict[str, Any] = {
            "Bucket": self.settings.storage_bucket,
            "Key": key,
            "Body": content,
        }
        if content_type:
            params["ContentType"] = content_type
        await self.client.put_object(**params)
    async def download_bytes(self, key: str, bucket: str | None = None) -> bytes:
        if self.client is None:
            raise RuntimeError("Storage chưa được khởi tạo.")
        response = await self.client.get_object(Bucket=bucket or self.settings.storage_bucket, Key=key)
        body = response["Body"]
        try:
            return await body.read()
        finally:
            body.close()
    async def xoa(self, key: str) -> None:
        if self.client is None:
            raise RuntimeError("Storage chưa được khởi tạo.")
        await self.client.delete_object(Bucket=self.settings.storage_bucket, Key=key)
    async def dong(self) -> None:
        if self._client_context is not None:
            await self._client_context.__aexit__(None, None, None)
        self._client_context = None
        self.client = None
storage_client: StorageClient | None = None
def tao_storage_client(settings: Settings) -> StorageClient:
    global storage_client
    if storage_client is None:
        storage_client = StorageClient(settings)
    return storage_client