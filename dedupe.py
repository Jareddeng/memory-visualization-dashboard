#!/usr/bin/env python3
"""Check if specific URLs/dates exist in clawbot_intel.json or archive files."""
import json
import glob
import sys

def check_exists(url=None, date=None, title_keyword=None):
    """Return True if matching record found, else False."""
    files = ["content/intel/clawbot_intel.json"] + glob.glob("content/intel/archive/*.json")
    
    for filepath in files:
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            records = data.get("records", [])
            for rec in records:
                if url and rec.get("url") == url:
                    return True
                if date and rec.get("date") == date:
                    return True
                if title_keyword and title_keyword.lower() in rec.get("title", "").lower():
                    return True
        except Exception:
            continue
    return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 dedupe.py <check_type> <value>")
        print("check_type: url, date, title")
        sys.exit(1)
    
    check_type = sys.argv[1]
    value = sys.argv[2]
    
    if check_type == "url":
        result = check_exists(url=value)
    elif check_type == "date":
        result = check_exists(date=value)
    elif check_type == "title":
        result = check_exists(title_keyword=value)
    else:
        print("Unknown check_type")
        sys.exit(1)
    
    print("TRUE" if result else "FALSE")
