"""Original Kairon UDP DNS exercise: one name, loopback only, no forwarding."""
import socket
import struct

ADDRESS = ("127.0.0.1", 1053)
TRAINING_NAME = "training.test"


def build_response(query):
    """Handle one uncompressed IN question; ignore malformed/unsupported packets."""
    if not 12 <= len(query) <= 512:
        return None
    transaction, flags, questions, _, _, _ = struct.unpack("!6H", query[:12])
    if flags & 0x8000 or flags & 0x7800 or questions != 1:
        return None
    offset = 12
    labels = []
    name_bytes = 0
    for _ in range(128):
        if offset >= len(query):
            return None
        length = query[offset]
        offset += 1
        if length == 0:
            break
        # Our dig exercise sends a simple name. Compression pointers are not
        # needed and are deliberately not followed by this teaching server.
        if length > 63 or offset + length > len(query):
            return None
        name_bytes += length + 1
        if name_bytes > 254:
            return None
        try:
            label = query[offset:offset + length].decode("ascii")
        except UnicodeDecodeError:
            return None
        labels.append(label)
        offset += length
    else:
        return None
    if offset + 4 > len(query):
        return None
    record_type, record_class = struct.unpack("!2H", query[offset:offset + 4])
    offset += 4
    name = ".".join(labels).lower()
    question = query[12:offset]
    answer = b""
    result_code = 0
    if record_class != 1:
        result_code = 4  # NOTIMP: this tiny exercise handles Internet class.
    elif name != TRAINING_NAME:
        result_code = 3  # NXDOMAIN: no such name in the owned teaching zone.
    elif record_type == 1:
        answer = b"\xc0\x0c" + struct.pack("!HHIH", 1, 1, 300, 4)
        answer += socket.inet_aton("192.0.2.28")
    # A known name queried as AAAA has no IPv6 record: NOERROR / zero answers.
    # QR + AA; echo RD, but do not advertise recursion (RA) or DNSSEC validation.
    response_flags = 0x8400 | (flags & 0x0100) | result_code
    header = struct.pack("!6H", transaction, response_flags, 1,
                         1 if answer else 0, 0, 0)
    return header + question + answer


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
        server.bind(ADDRESS)
        print("Kairon DNS: UDP 127.0.0.1:1053 ; training.test A ; stop with Ctrl+C",
              flush=True)
        try:
            while True:
                query, client = server.recvfrom(512)
                if client[0] != "127.0.0.1":
                    continue
                response = build_response(query)
                if response is not None:
                    server.sendto(response, client)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
