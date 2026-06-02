class TokenCounter:
    def count(self, text: str | None) -> int:
        if not text:
            return 0
        ascii_count = 0
        non_ascii_count = 0
        for char in text:
            if ord(char) < 128:
                ascii_count += 1
            else:
                non_ascii_count += 1
        return max(1, round(ascii_count / 4 + non_ascii_count / 1.5))

    def message_tokens(self, message: dict) -> int:
        return self.count(message.get("content", "")) + 4
