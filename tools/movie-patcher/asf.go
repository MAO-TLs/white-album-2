package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
)

var asfHeader = []byte{0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c}
var asfStream = []byte{0x91, 0x07, 0xdc, 0xb7, 0xb7, 0xa9, 0xcf, 0x11, 0x8e, 0xe6, 0x00, 0xc0, 0x0c, 0x20, 0x53, 0x65}
var asfAudio = []byte{0x40, 0x9e, 0x69, 0xf8, 0x4d, 0x5b, 0xcf, 0x11, 0xa8, 0xfd, 0x00, 0x80, 0x5f, 0x5c, 0x44, 0x2b}
var asfFile = []byte{0xa1, 0xdc, 0xab, 0x8c, 0x47, 0xa9, 0xcf, 0x11, 0x8e, 0xe4, 0x00, 0xc0, 0x0c, 0x20, 0x53, 0x65}

// Read WAVEFORMATEX.nBlockAlign from the actual ASF audio stream, not a
// guessed constant or the encoded video bitrate. FFmpeg's single-payload
// ASF packet needs 28 bytes of overhead in addition to the audio object.
func audioPacketSize(path string) (int, int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()
	return readAudioPacketSize(f)
}

func readAudioPacketSize(r io.Reader) (int, int, error) {
	header := make([]byte, 30)
	if _, err := io.ReadFull(r, header); err != nil {
		return 0, 0, err
	}
	if !bytes.Equal(header[:16], asfHeader) {
		return 0, 0, errors.New("not an ASF header")
	}
	size := binary.LittleEndian.Uint64(header[16:24])
	if size < 30 || size > 16*1024*1024 {
		return 0, 0, errors.New("invalid ASF header size")
	}
	body := make([]byte, int(size)-30)
	if _, err := io.ReadFull(r, body); err != nil {
		return 0, 0, err
	}
	count := binary.LittleEndian.Uint32(header[24:28])
	block, packet := 0, 0
	for i := uint32(0); i < count; i++ {
		if len(body) < 24 {
			return 0, 0, errors.New("truncated ASF object")
		}
		n := binary.LittleEndian.Uint64(body[16:24])
		if n < 24 || n > uint64(len(body)) {
			return 0, 0, errors.New("invalid ASF object size")
		}
		obj := body[:int(n)]
		if bytes.Equal(obj[:16], asfFile) {
			if len(obj) < 104 {
				return 0, 0, errors.New("short ASF file properties")
			}
			lo, hi := binary.LittleEndian.Uint32(obj[92:96]), binary.LittleEndian.Uint32(obj[96:100])
			if lo != hi {
				return 0, 0, errors.New("variable ASF packet sizes unsupported")
			}
			packet = int(hi)
		}
		if bytes.Equal(obj[:16], asfStream) {
			if len(obj) < 78 {
				return 0, 0, errors.New("short ASF stream properties")
			}
			if bytes.Equal(obj[24:40], asfAudio) {
				length := int(binary.LittleEndian.Uint32(obj[64:68]))
				if length < 16 || length > len(obj)-78 {
					return 0, 0, errors.New("invalid audio format")
				}
				a := int(binary.LittleEndian.Uint16(obj[90:92]))
				if a == 0 {
					return 0, 0, errors.New("zero audio block alignment")
				}
				if a > block {
					block = a
				}
			}
		}
		body = body[int(n):]
	}
	if block == 0 || packet == 0 {
		return 0, 0, errors.New("missing ASF audio or file properties")
	}
	required := block + 28
	if required < 3200 {
		required = 3200
	}
	if required > 65536 {
		return 0, 0, fmt.Errorf("audio requires unsupported %d-byte packets", required)
	}
	return required, packet, nil
}
