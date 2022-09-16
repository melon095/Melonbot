// Helper functions

package helper

import (
	"encoding/json"
	"io"
	"os"
)

// DeserializeStruct loads a struct from a io.Reader
func DeserializeStruct[T interface{}](reader io.Reader) (*T, error) {
	var C T

	json := json.NewDecoder(reader)
	err := json.Decode(&C)
	if err != nil {
		return nil, err
	}

	return &C, nil
}

func SerializeStruct[T interface{}](c T) ([]byte, error) {
	json, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}

	return json, nil
}

func ReadFile(path string) (io.Reader, error) {
	_, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}

	return file, nil
}