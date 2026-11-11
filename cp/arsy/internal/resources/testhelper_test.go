package resources

import "os"

func writeTestFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

func readTestFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	return string(data), err
}
