"""Package owned local practice, generating an inert PNG and synthetic HTTP PCAP."""
from pathlib import Path
from hashlib import sha256
import json
import socket
import struct
import zipfile
import zlib


def checksum(data):
    if len(data) % 2:
        data += b'\0'
    value = sum(struct.unpack('!' + 'H' * (len(data) // 2), data))
    while value >> 16:
        value = (value & 65535) + (value >> 16)
    return (~value) & 65535


def frame(source_port, destination_port, sequence, acknowledgment, flags, payload=b''):
    address = socket.inet_aton('127.0.0.1')
    tcp = struct.pack('!HHIIBBHHH', source_port, destination_port, sequence,
                      acknowledgment, 5 << 4, flags, 64240, 0, 0)
    pseudo = address + address + struct.pack('!BBH', 0, 6, len(tcp) + len(payload))
    tcp = tcp[:16] + struct.pack('!H', checksum(pseudo + tcp + payload)) + tcp[18:] + payload
    ip = struct.pack('!BBHHHBBH4s4s', 0x45, 0, 20 + len(tcp), 28, 0x4000,
                     64, 6, 0, address, address)
    ip = ip[:10] + struct.pack('!H', checksum(ip)) + ip[12:]
    return bytes.fromhex('0200000000010200000000020800') + ip + tcp


def make_pcap():
    request = b'GET /health HTTP/1.1\r\nHost: 127.0.0.1:8765\r\nConnection: close\r\n\r\n'
    body = b'KAIRON-LOCAL-28\n'
    response = (b'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: '
                + str(len(body)).encode() + b'\r\nConnection: close\r\n\r\n' + body)
    packets = [
        frame(49152, 8765, 1000, 0, 0x02),
        frame(8765, 49152, 7000, 1001, 0x12),
        frame(49152, 8765, 1001, 7001, 0x10),
        frame(49152, 8765, 1001, 7001, 0x18, request),
        frame(8765, 49152, 7001, 1001 + len(request), 0x18, response),
        frame(49152, 8765, 1001 + len(request), 7001 + len(response), 0x11),
        frame(8765, 49152, 7001 + len(response), 1002 + len(request), 0x11),
        frame(49152, 8765, 1002 + len(request), 7002 + len(response), 0x10),
    ]
    result = struct.pack('<IHHIIII', 0xA1B2C3D4, 2, 4, 0, 0, 65535, 1)
    for index, data in enumerate(packets):
        result += struct.pack('<IIII', 1793181600, index * 1000, len(data), len(data)) + data
    return result


def make_png():
    def chunk(kind, payload):
        return (struct.pack('!I', len(payload)) + kind + payload
                + struct.pack('!I', zlib.crc32(kind + payload)))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('!IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            + chunk(b'tEXt', b'Description\0KAIRON-META-28')
            + chunk(b'tEXt', b'Software\0Kairon')
            + chunk(b'IDAT', zlib.compress(b'\x00\x90\xdd\x22', 9))
            + chunk(b'IEND', b''))

ROOT=Path(__file__).resolve().parents[1]
KIT=ROOT/'public/labs/kairon-toolbox'
(KIT/'data').mkdir(parents=True,exist_ok=True)
(KIT/'traffic').mkdir(exist_ok=True)
(KIT/'data/metadata.png').write_bytes(make_png())
(KIT/'traffic/local-http.pcap').write_bytes(make_pcap())
files=sorted(path for path in KIT.rglob('*') if path.is_file() and '__pycache__' not in path.parts and 'work' not in path.relative_to(KIT).parts)
if not files: raise RuntimeError('Toolbox teaching files missing')
target=ROOT/'public/downloads/kairon-toolbox.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        if path.suffix not in {'.md','.txt','.csv','.html','.py','.sha256','.json','.yar','.png','.pcap'}: raise ValueError('Unexpected sample type: '+path.name)
        if path.suffix not in {'.png','.pcap'}: path.read_text(encoding='utf-8')
        if path.read_bytes().startswith((b'MZ',b'\x7fELF')): raise ValueError('Executable headers not allowed')
        info=zipfile.ZipInfo('kairon-toolbox/'+path.relative_to(KIT).as_posix(),(2026,10,28,0,0,0))
        info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,path.read_bytes())
manifest={'file':target.name,'version':2,'files':len(files),'sha256':sha256(target.read_bytes()).hexdigest()}
target.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(manifest))
