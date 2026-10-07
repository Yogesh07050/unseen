"""USFM reference parsing shared by the API and the database seed.

A USFM verse id looks like ``EPH.4.26`` (book code . chapter . verse). This
module only turns such ids into structured parts and a human label such as
``Ephesians 4:26``. It never carries Scripture text: text is fetched live from
YouVersion via GET /api/verse/{bibleId}/{usfm}.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

USFM_RE = re.compile(r"^(?P<book>[1-3A-Z]{3})\.(?P<chapter>\d{1,3})\.(?P<verse>\d{1,3})$")

# Protestant canon, USFM 3-letter book codes -> display names.
BOOK_NAMES: dict[str, str] = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers", "DEU": "Deuteronomy",
    "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
    "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra",
    "NEH": "Nehemiah", "EST": "Esther", "JOB": "Job", "PSA": "Psalm", "PRO": "Proverbs",
    "ECC": "Ecclesiastes", "SNG": "Song of Songs", "ISA": "Isaiah", "JER": "Jeremiah",
    "LAM": "Lamentations", "EZK": "Ezekiel", "DAN": "Daniel", "HOS": "Hosea", "JOL": "Joel",
    "AMO": "Amos", "OBA": "Obadiah", "JON": "Jonah", "MIC": "Micah", "NAM": "Nahum",
    "HAB": "Habakkuk", "ZEP": "Zephaniah", "HAG": "Haggai", "ZEC": "Zechariah", "MAL": "Malachi",
    "MAT": "Matthew", "MRK": "Mark", "LUK": "Luke", "JHN": "John", "ACT": "Acts", "ROM": "Romans",
    "1CO": "1 Corinthians", "2CO": "2 Corinthians", "GAL": "Galatians", "EPH": "Ephesians",
    "PHP": "Philippians", "COL": "Colossians", "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", "TIT": "Titus", "PHM": "Philemon", "HEB": "Hebrews",
    "JAS": "James", "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John", "2JN": "2 John",
    "3JN": "3 John", "JUD": "Jude", "REV": "Revelation",
}


@dataclass(frozen=True)
class Usfm:
    usfm: str
    book: str
    chapter: int
    verse: int

    @property
    def reference(self) -> str:
        return f"{BOOK_NAMES[self.book]} {self.chapter}:{self.verse}"


def parse(usfm: str) -> Usfm:
    """Parse ``'EPH.4.26'`` -> Usfm(book='EPH', chapter=4, verse=26). Raises ValueError."""
    m = USFM_RE.match(usfm)
    if not m or m["book"] not in BOOK_NAMES:
        raise ValueError(f"not a USFM verse id: {usfm!r}")
    return Usfm(usfm=usfm, book=m["book"], chapter=int(m["chapter"]), verse=int(m["verse"]))


def is_usfm(value: str) -> bool:
    try:
        parse(value)
    except ValueError:
        return False
    return True
