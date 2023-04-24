package status

import (
	"encoding/json"
	"fmt"
	"runtime"
)

// Status holds the status of the application
type Status struct {
	// Amount of goroutines running
	GoroutineCount int `json:"goroutine_count"`
	// Memory allocated in bytes
	MemoryUsage uint64 `json:"memory_usage"`
}

func bToMb(b uint64) uint64 {
	return b / 1024 / 1024
}

// Converts the memory usage to a string formatted in mb
func (s *Status) MemoryUsageToStr() string {
	mb := bToMb(s.MemoryUsage)
	if mb == 0 {
		return "Less than 1mb"
	}

	return fmt.Sprintf("%dmb", mb)
}

func (s *Status) MarshalJSON() ([]byte, error) {
	return json.Marshal(
		struct {
			GoroutineCount int    `json:"goroutine_count"`
			MemoryUsage    string `json:"memory_usage"`
		}{
			GoroutineCount: s.GoroutineCount,
			MemoryUsage:    s.MemoryUsageToStr(),
		},
	)
}

// NewStatus creates a new status object
func NewStatus() *Status {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return &Status{
		GoroutineCount: runtime.NumGoroutine(),
		MemoryUsage:    m.Alloc,
	}
}
