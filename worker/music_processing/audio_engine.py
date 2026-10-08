import random

class MusicEngine:
    """
    Handles music selection for batch video rendering.
    Enforces 'Shuffle without repeat' across videos in a batch.
    """
    def __init__(self, music_tracks: list[str]):
        """
        music_tracks: list of file paths to available music files
        """
        self.available_tracks = music_tracks
        self.current_pool = []

    def get_next_track(self) -> str:
        """Returns the next track path using shuffle without repeat."""
        if not self.available_tracks:
            return None

        if not self.current_pool:
            self.current_pool = self.available_tracks.copy()
            random.shuffle(self.current_pool)

        return self.current_pool.pop(0)
