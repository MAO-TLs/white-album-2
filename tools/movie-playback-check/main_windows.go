// A 32-bit DirectShow graph-construction check using the same RenderFile entry
// point as WA2. It does not change files or registry settings and is not proof
// of visible playback, sound, or A/V synchronization.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"
)

type guid struct {
	A    uint32
	B, C uint16
	D    [8]byte
}

var clsidGraph = guid{0xe436ebb3, 0x524f, 0x11ce, [8]byte{0x9f, 0x53, 0, 0x20, 0xaf, 0x0b, 0xa7, 0x70}}
var iidGraph = guid{0x56a868a9, 0x0ad4, 0x11ce, [8]byte{0xb0, 0x3a, 0, 0x20, 0xaf, 0x0b, 0xa7, 0x70}}
var iidVideo = guid{0x56a868b4, 0x0ad4, 0x11ce, [8]byte{0xb0, 0x3a, 0, 0x20, 0xaf, 0x0b, 0xa7, 0x70}}

func call(obj uintptr, slot int, args ...uintptr) uint32 {
	vtable := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vtable + uintptr(slot)*unsafe.Sizeof(obj)))
	params := append([]uintptr{obj}, args...)
	r, _, _ := syscall.SyscallN(fn, params...)
	return uint32(r)
}

type result struct {
	File   string `json:"file"`
	Create string `json:"create_graph_hresult"`
	Render string `json:"render_file_hresult,omitempty"`
	OK     bool   `json:"graph_built"`
}

func main() {
	runtime.LockOSThread()
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: movie-playback-check.exe movie.pak [...]")
		os.Exit(2)
	}
	ole := syscall.NewLazyDLL("ole32.dll")
	hr, _, _ := ole.NewProc("CoInitializeEx").Call(0, 2)
	if int32(hr) < 0 {
		fmt.Fprintf(os.Stderr, "CoInitializeEx: 0x%08x\n", uint32(hr))
		os.Exit(2)
	}
	defer ole.NewProc("CoUninitialize").Call()
	failures := 0
	for _, arg := range os.Args[1:] {
		path, err := filepath.Abs(arg)
		if err != nil {
			panic(err)
		}
		name, err := syscall.UTF16PtrFromString(path)
		if err != nil {
			panic(err)
		}
		var graph uintptr
		hr, _, _ = ole.NewProc("CoCreateInstance").Call(uintptr(unsafe.Pointer(&clsidGraph)), 0, 1, uintptr(unsafe.Pointer(&iidGraph)), uintptr(unsafe.Pointer(&graph)))
		r := result{File: path, Create: fmt.Sprintf("0x%08x", uint32(hr))}
		if int32(hr) >= 0 && graph != 0 {
			code := call(graph, 13, uintptr(unsafe.Pointer(name)), 0)
			r.Render = fmt.Sprintf("0x%08x", code)
			r.OK = code == 0 // Reject partial-render success codes too.
			var video uintptr
			if int32(call(graph, 0, uintptr(unsafe.Pointer(&iidVideo)), uintptr(unsafe.Pointer(&video)))) >= 0 && video != 0 {
				call(video, 13, 0) // IVideoWindow::put_AutoShow(FALSE)
				call(video, 19, 0) // IVideoWindow::put_Visible(FALSE)
				call(video, 2)
			}
			call(graph, 2)
		}
		if !r.OK {
			failures++
		}
		json.NewEncoder(os.Stdout).Encode(r)
	}
	if failures > 0 {
		os.Exit(1)
	}
}
