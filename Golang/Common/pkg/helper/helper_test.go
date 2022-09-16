package helper

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReadConfig(t *testing.T) {
	type T struct {
		A string `json:"a"`
		B string `json:"b"`
	}

	type TestCase struct {
		Input      string
		Expected   T
		ShouldFail bool
	}

	testCases := []TestCase{
		{
			Input:      "{\"a\": \"foo\", \"b\": \"bar\"}",
			Expected:   T{A: "foo", B: "bar"},
			ShouldFail: false,
		},
		{
			Input:      "{\"c\": \"foo\", \"b\": \"bar\"",
			Expected:   T{A: "foo", B: "bar"},
			ShouldFail: true,
		},
	}

	for _, testCase := range testCases {
		reader := strings.NewReader(testCase.Input)
		result, err := DeserializeStruct[T](reader)
		if testCase.ShouldFail {
			assert.NotNil(t, err)
		} else {
			assert.Nil(t, err)
			assert.Equal(t, testCase.Expected, *result)
		}
	}

}