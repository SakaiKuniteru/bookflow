from typing import BinaryIO
import io
import uuid
from app.core.config import Settings

class StorageClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = None
        self.bucket = settings.storage_bucket

    async def khoi_tao(self) -> None:
        if not self.settings.storage_endpoint:
            return
        try:
            from aiobotocore.session import get_session
            session = get_session()
            self.client = session.create_client(
                "s3",
                endpoint_url=self.settings.storage_endpoint,
                aws_access_key_id=self.settings.storage_access_key,
                aws_secret_access_key=self.settings.storage_secret_key
            )
        except ImportError:
            self.client = None

    async def dong(self) -> None:
        if self.client:
            await self.client.__aexit__(None, None, None)
            self.client = None

    def san_sang(self) -> bool:
        return self.client is not None

    def tao_key(self, prefix: str, filename: str) -> str:
        ten_file = filename.strip().replace("\\", "/").split("/")[-1]
        return f"{prefix.strip('/')}/{uuid.uuid4().hex}_{ten_file}"

    async def upload_bytes(self, data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        if not self.client:
            raise RuntimeError("Storage chưa được khởi tạo")
        await self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type
        )
        return key

    async def upload_file(self, file: BinaryIO, key: str, content_type: str = "application/octet-stream") -> str:
        data = file.read()
        if not isinstance(data, bytes):
            raise ValueError("File phải trả về dữ liệu bytes")
        return await self.upload_bytes(data, key, content_type)

    async def download_bytes(self, key: str) -> bytes:
        if not self.client:
            raise RuntimeError("Storage chưa được khởi tạo")
        response = await self.client.get_object(
            Bucket=self.bucket,
            Key=key
        )
        body = response["Body"]
        return await body.read()

    async def xoa(self, key: str) -> None:
        if not self.client:
            raise RuntimeError("Storage chưa được khởi tạo")
        await self.client.delete_object(
            Bucket=self.bucket,
            Key=key
        )

storage_client: StorageClient | None = None

def tao_storage_client(settings: Settings) -> StorageClient:
    global storage_client
    if storage_client is None:
        storage_client = StorageClient(settings)
    return storage_client