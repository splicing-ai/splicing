import datetime
import json
from enum import Enum
from typing import Any

import pandas as pd
from redis import asyncio as aioredis

from app.utils.helper import serialize_df


class CustomJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Enum):
            return obj.value
        return super().default(obj)


class RedisClient:
    def __init__(self, redis: aioredis.Redis) -> None:
        self.redis = redis

    async def _set(self, key: str, value: Any) -> None:
        if isinstance(value, pd.DataFrame):
            value = serialize_df(value)
        else:
            value = json.dumps(value, cls=CustomJsonEncoder)
        await self.redis.set(key, value)

    async def _get(self, key: str) -> Any:
        result = await self.redis.get(key)
        if result:
            return json.loads(result.decode())
        else:
            return None

    async def _delete(self, key: str) -> None:
        await self.redis.delete(key)

    async def _add_set_data(self, key: str, *values: Any) -> None:
        await self.redis.sadd(
            key, *[json.dumps(value, cls=CustomJsonEncoder) for value in values]
        )

    async def _delete_set_data(self, key: str, value: Any) -> None:
        await self.redis.srem(key, json.dumps(value, cls=CustomJsonEncoder))

    async def _get_set_data(self, key: str) -> set:
        result = await self.redis.smembers(key)
        return {json.loads(e.decode()) for e in result}

    async def _append_list_data(self, key: str, *values: Any) -> None:
        # will create a list if it doesn't exist
        await self.redis.rpush(
            key, *[json.dumps(value, cls=CustomJsonEncoder) for value in values]
        )

    async def _get_list_data(self, key: str) -> list:
        result = await self.redis.lrange(key, 0, -1)
        return [json.loads(e.decode()) for e in result]

    async def _delete_list_data(self, key: str, value: Any) -> None:
        # remove the first occurrence
        await self.redis.lrem(key, 1, json.dumps(value, cls=CustomJsonEncoder))

    async def _move_list_data(self, key: str, value: Any, direction: str) -> None:
        data = await self._get_list_data(key)
        idx = data.index(value)
        idx_swap = -1
        if idx > 0 and direction == "up":
            idx_swap = idx - 1
        elif idx < len(data) - 1 and direction == "down":
            idx_swap = idx + 1
        if idx_swap >= 0:
            await self.redis.lset(
                key, idx, json.dumps(data[idx_swap], cls=CustomJsonEncoder)
            )
            await self.redis.lset(
                key, idx_swap, json.dumps(value, cls=CustomJsonEncoder)
            )

    async def add_project_id(self, project_id: str) -> None:
        await self._add_set_data("projects", project_id)

    async def delete_project_id(self, project_id: str) -> None:
        await self._delete_set_data("projects", project_id)

    async def get_all_project_ids(self) -> set[str]:
        key = "projects"
        if not await self.redis.exists(key):
            return set()
        result = await self._get_set_data(key)
        return result

    async def update_project_modified_on(self, project_id: str) -> None:
        metadata = await self.get_project_data(project_id, "metadata")
        metadata["modifiedOn"] = datetime.datetime.utcnow().isoformat()
        await self._set(f"{project_id}:metadata", metadata)

    async def set_project_data(self, project_id: str, key: str, value: Any) -> None:
        await self._set(f"{project_id}:{key}", value)
        await self.update_project_modified_on(project_id)

    async def delete_project_data(self, project_id: str, key: str) -> None:
        await self._delete(f"{project_id}:{key}")
        await self.update_project_modified_on(project_id)

    async def get_project_data(self, project_id: str, key: str) -> Any:
        result = await self._get(f"{project_id}:{key}")
        return result

    async def delete_all_project_data(self, project_id: str) -> None:
        async for key in self.redis.scan_iter(f"{project_id}:*"):
            await self._delete(key.decode())

    async def get_settings_data(
        self, section_type: str, key: str | None = None
    ) -> dict:
        if key:
            result = await self._get(f"settings:{section_type}:{key}")
            return result
        else:
            result = {}
            async for key in self.redis.scan_iter(f"settings:{section_type}:*"):
                key = key.decode()
                _, _, key_name = key.split(":")
                value = await self._get(key)
                result[key_name] = value
            return result

    async def get_all_settings_data(self) -> list:
        result = []
        async for key in self.redis.scan_iter("settings:*"):
            key = key.decode()
            _, section_type, key_name = key.split(":")
            value = await self._get(key)
            result.append(
                {
                    "sectionType": section_type,
                    "key": key_name,
                    "value": value,
                }
            )
        return result

    async def set_settings_data(self, section_type: str, key: str, value: dict) -> None:
        await self._set(f"settings:{section_type}:{key}", value)

    async def delete_settings_data(self, section_type: str, key: str) -> None:
        await self._delete(f"settings:{section_type}:{key}")

    async def get_all_section_ids(self, project_id: str) -> list:
        key = f"{project_id}:sections"
        if not await self.redis.exists(key):
            return []
        result = await self._get_list_data(key)
        return result

    async def get_section_data(self, project_id: str, section_id: str, key: str) -> Any:
        result = await self.get_project_data(project_id, f"section:{section_id}:{key}")
        return result

    async def delete_all_section_data(self, project_id: str, section_id: str) -> None:
        async for key in self.redis.scan_iter(f"{project_id}:section:{section_id}:*"):
            await self._delete(key)

    async def move_section(
        self, project_id: str, section_id: str, direction: str
    ) -> None:
        await self._move_list_data(f"{project_id}:sections", section_id, direction)

    async def add_section_id(self, project_id: str, section_id: str) -> None:
        await self._append_list_data(f"{project_id}:sections", section_id)

    async def delete_section_id(self, project_id: str, section_id: str) -> None:
        await self._delete_list_data(f"{project_id}:sections", section_id)

    async def set_section_data(
        self, project_id: str, section_id: str, key: str, value: Any
    ) -> None:
        await self.set_project_data(project_id, f"section:{section_id}:{key}", value)

    async def delete_section_data(
        self, project_id: str, section_id: str, key: str
    ) -> None:
        await self.delete_project_data(project_id, f"section:{section_id}:{key}")

    async def get_all_block_ids(self, project_id: str, section_id: str) -> list:
        key = f"{project_id}:section:{section_id}:blocks"
        if not await self.redis.exists(key):
            return []
        result = await self._get_list_data(key)
        return result

    async def get_block_data(
        self,
        project_id: str,
        section_id: str,
        block_id: str,
        key: str,
    ) -> Any:
        result = await self.get_section_data(
            project_id,
            section_id,
            f"block:{block_id}:{key}",
        )
        return result

    async def delete_all_block_data(
        self, project_id: str, section_id: str, block_id: str
    ) -> None:
        async for key in self.redis.scan_iter(
            f"{project_id}:section:{section_id}:block:{block_id}:*"
        ):
            await self._delete(key.decode())

    async def add_block_id(
        self, project_id: str, section_id: str, block_id: str
    ) -> None:
        await self._append_list_data(
            f"{project_id}:section:{section_id}:blocks", block_id
        )

    async def delete_block_id(
        self, project_id: str, section_id: str, block_id: str
    ) -> None:
        await self._delete_list_data(
            f"{project_id}:section:{section_id}:blocks", block_id
        )

    async def set_block_data(
        self, project_id: str, section_id: str, block_id: str, key: str, value: Any
    ) -> None:
        await self.set_section_data(
            project_id, section_id, f"block:{block_id}:{key}", value
        )

    async def delete_block_data(
        self, project_id: str, section_id: str, block_id: str, key: str
    ) -> None:
        await self.delete_section_data(
            project_id, section_id, f"block:{block_id}:{key}"
        )
