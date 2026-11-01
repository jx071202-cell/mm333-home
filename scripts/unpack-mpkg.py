"""解包 .mpkg（PKGM0014）：条目表为 [u32 名字长度][名字][u32 偏移][u32 大小]，偏移相对数据段。"""
import json
import struct
import sys
from pathlib import Path

src = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

data = src.read_bytes()

magic_len = struct.unpack_from("<I", data, 0)[0]
magic = data[4:4 + magic_len].decode("ascii", "replace")
count = struct.unpack_from("<I", data, 4 + magic_len)[0]
print(f"magic={magic!r} magic_len={magic_len} entries={count}")

pos = 8 + magic_len
entries = []
for _ in range(count):
    (name_len,) = struct.unpack_from("<I", data, pos)
    pos += 4
    name = data[pos:pos + name_len].decode("utf-8")
    pos += name_len
    offset, size = struct.unpack_from("<II", data, pos)
    pos += 8
    entries.append((name, offset, size))

data_start = pos
print(f"data_start=0x{data_start:x} ({data_start})")
print(f"file size={len(data):,}")

total = 0
for name, offset, size in entries:
    start = data_start + offset
    end = start + size
    payload = data[start:end]
    total += size
    target = out / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    print(f"  {name:<46} off={offset:>12,} size={size:>12,} -> {target}")

print(f"payload 合计={total:,}  实际文件={len(data):,}  差值={len(data) - data_start - total}")

# 顺便看看 project.json
pj = out / "project.json"
if pj.exists():
    try:
        obj = json.loads(pj.read_text(encoding="utf-8"))
        print("\nproject.json 内容:")
        print(json.dumps(obj, ensure_ascii=False, indent=2)[:1200])
    except Exception as exc:  # noqa: BLE001
        print("project.json 解析失败:", exc, "原始内容:",
              pj.read_bytes()[:200])
