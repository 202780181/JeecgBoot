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
        return self.content_tokens(message.get("content", "")) + 4

    def content_tokens(self, content) -> int:
        if isinstance(content, str) or content is None:
            return self.count(content)
        if isinstance(content, list):
            total = 0
            for part in content:
                if not isinstance(part, dict):
                    continue
                part_type = part.get("type")
                if part_type == "text":
                    total += self.count(part.get("text"))
                elif part_type in {"image_url", "input_image"}:
                    # Conservative placeholder for budget accounting. The provider
                    # does the real image-token accounting after fetching the image.
                    total += 1024
            return total
        return self.count(str(content))
