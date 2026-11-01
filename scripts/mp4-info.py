"""不依赖 ffprobe，直接解析 mp4 盒子拿时长/分辨率/编码。"""
import struct
import sys
from pathlib import Path

path = Path(sys.argv[1])
buf = path.read_bytes()
print(f"size: {len(buf):,}")

def boxes(data, start=0, end=None, depth=0):
    end = len(data) if end is None else end
    pos = start
    while pos + 8 <= end:
        size = struct.unpack_from(">I", data, pos)[0]
        typ = data[pos + 4:pos + 8].decode("latin1")
        header = 8
        if size == 1:
            size = struct.unpack_from(">Q", data, pos + 8)[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header:
            break
        yield typ, pos, size, header, depth
        if typ in {"moov", "trak", "mdia", "minf", "stbl", "edts", "dinf"}:
            yield from boxes(data, pos + header, pos + size, depth + 1)
        pos += size

mvhd = None
tkhd = None
mdhd = None
hdlr = None
stsd = None
for typ, pos, size, header, depth in boxes(buf):
    body = pos + header
    if typ == "mvhd":
        version = buf[body]
        if version == 1:
            timescale = struct.unpack_from(">I", buf, body + 20)[0]
            duration = struct.unpack_from(">Q", buf, body + 24)[0]
        else:
            timescale = struct.unpack_from(">I", buf, body + 12)[0]
            duration = struct.unpack_from(">I", buf, body + 16)[0]
        mvhd = (timescale, duration)
    elif typ == "tkhd":
        version = buf[body]
        if version == 1:
            w = struct.unpack_from(">I", buf, body + 88)[0]
            h = struct.unpack_from(">I", buf, body + 92)[0]
        else:
            w = struct.unpack_from(">I", buf, body + 76)[0]
            h = struct.unpack_from(">I", buf, body + 80)[0]
        tkhd = (w / 65536, h / 65536)
    elif typ in {"avc1", "hvc1", "hev1", "vp09", "av01", "mp4v"}:
        stsd = typ

print("mvhd:", mvhd)
print("tkhd (宽x高):", tkhd)
print("视频编码:", stsd)
if mvhd and mvhd[0]:
    ts, dur = mvhd
    secs = dur / ts
    print(f"时长: {secs:.2f} 秒 = {int(secs // 60)} 分 {secs % 60:.1f} 秒")
print("码率估算: %.1f Mbps" % (len(buf) * 8 / (mvhd[1] / mvhd[0]) / 1e6) if mvhd and mvhd[1] else "码率: 未知")
