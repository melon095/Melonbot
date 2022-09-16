package assert

import (
	"errors"
	"testing"
)

func TestAssert(t *testing.T) {
	t.Run("ErrAssert runs", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did not panic")
			}
		}()
		
		err := errors.New("T")

		ErrAssert(err, "T")
	})

	t.Run("ErrAssert fails", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("The code did panic")
			}
		}()
		
		var err error

		ErrAssert(err, "F")
	})

	t.Run("Assert runs", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("The code did not panic")
			}
		}()
		
		Assert(true, "T")
	})

	t.Run("Assert fails", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("The code did panic")
			}
		}()
		
		Assert(false, "F")
	})
}