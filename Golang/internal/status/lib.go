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
	MemoryUsage int `json:"memory_usage"`
}

// Converts the memory usage to a string formatted in mb
func (s *Status) MemoryUsageToStr() string {
	return fmt.Sprintf("%dmb", s.MemoryUsage/1000000)
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
		MemoryUsage:    int(m.Alloc),
	}
}
