"""Rebuild a deterministic ZIP and a synthetic TCP/HTTP PCAP from owned fixtures."""
from pathlib import Path
from hashlib import sha256
import json
import socket
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "public/labs/kairon-kali-lab"
DOWNLOADS = ROOT / "public/downloads"


def checksum(data):
    if len(data) % 2:
        data += b"\x00"
    total = sum(struct.unpack("!" + "H" * (len(data) // 2), data))
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return (~total) & 0xFFFF


def packet(source_port, dest_port, seq, ack, flags, payload=b""):
    address = socket.inet_aton("127.0.0.1")
    tcp = struct.pack("!HHIIBBHHH", source_port, dest_port, seq, ack, 5 << 4, flags, 64240, 0, 0)
    pseudo = address + address + struct.pack("!BBH", 0, 6, len(tcp) + len(payload))
    value = checksum(pseudo + tcp + payload)
    tcp = tcp[:16] + struct.pack("!H", value) + tcp[18:] + payload
    ip = struct.pack("!BBHHHBBH4s4s", 0x45, 0, 20 + len(tcp), 1, 0x4000, 64, 6, 0, address, address)
    ip = ip[:10] + struct.pack("!H", checksum(ip)) + ip[12:]
    return b"\x02\x00\x00\x00\x00\x01\x02\x00\x00\x00\x00\x02\x08\x00" + ip + tcp


def make_pcap():
    request = b"GET /lesson HTTP/1.1\r\nHost: 127.0.0.1:8000\r\nConnection: close\r\n\r\n"
    response = b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 12\r\nConnection: close\r\n\r\nKairon demo\n"
    packets = [
        packet(49152, 8000, 1000, 0, 0x02),
        packet(8000, 49152, 7000, 1001, 0x12),
        packet(49152, 8000, 1001, 7001, 0x10),
        packet(49152, 8000, 1001, 7001, 0x18, request),
        packet(8000, 49152, 7001, 1001 + len(request), 0x18, response),
        packet(49152, 8000, 1001 + len(request), 7001 + len(response), 0x11),
        packet(8000, 49152, 7001 + len(response), 1002 + len(request), 0x11),
        packet(49152, 8000, 1002 + len(request), 7002 + len(response), 0x10),
    ]
    result = struct.pack("<IHHIIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1)
    for index, data in enumerate(packets):
        result += struct.pack("<IIII", 1792490400 + index, 0, len(data), len(data)) + data
    return result


def main():
    DOWNLOADS.mkdir(exist_ok=True)
    (KIT / "traffic").mkdir(exist_ok=True)
    (KIT / "traffic/local-http.pcap").write_bytes(make_pcap())
    clean = (KIT / "integrity/clean.txt").read_bytes()
    (KIT / "integrity/SHA256SUMS").write_text(f"{sha256(clean).hexdigest()}  clean.txt\n", encoding="utf-8", newline="\n")
    output = DOWNLOADS / "kairon-kali-lab.zip"
    files = sorted(path for path in KIT.rglob("*") if path.is_file() and not set(path.relative_to(KIT).parts).intersection({"runtime", "__pycache__"}) and path.suffix != ".pyc")
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            name = "kairon-kali-lab/" + path.relative_to(KIT).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 25, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    manifest = {"file": output.name, "version": 1, "sha256": sha256(output.read_bytes()).hexdigest(), "files": len(files)}
    (DOWNLOADS / "kairon-kali-lab.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(manifest))


if __name__ == "__main__":
    main()
