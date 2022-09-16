package assert

import "github.com/JoachimFlottorp/Melonbot/Golang/Common/pkg/log"

// ErrAssert is a helper function to assert that an error is nil
//
// Panics if the error is not nil
//
// ALlows setting a custom error message
func ErrAssert(e error, message ...string) {
	if e != nil {
		if len(message) > 0 {
			panic(message[0] + ": " + e.Error())
		}
		panic(e.Error())
	}	
}

// Validates that the statement is true
func Assert(statement bool, message ...string) {
	if !statement {
		if len(message) > 0 {
			log.Get().Warn(message[0])
		}
		panic("assertion failed")
	}
}