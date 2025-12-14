#!/usr/bin/env python3
"""
Generate GIF hover CSS rules from post frontmatter.

Reads all posts in src/posts/*.md, extracts title and gif fields,
and updates the SCSS file with the generated hover rules.
"""

import os
import re
import glob
import yaml

POSTS_DIR = "src/posts"
SCSS_FILE = "src/scss/themes/base/_style-theme.scss"
START_MARKER = "/* AUTO-GENERATED:START - Do not edit manually. Run update-gif-hovers action. */"
END_MARKER = "/* AUTO-GENERATED:END */"


def title_to_class(title: str) -> str:
    """
    Convert a post title to CSS class name.
    Matches the Nunjucks filter in loop.njk:
    {{ post.data.title | replace(" ", "-") | replace(".", "") | replace("'", "") | replace("!", "") }}
    """
    result = title
    result = result.replace(" ", "-")
    result = result.replace(".", "")
    result = result.replace("'", "")
    result = result.replace("!", "")
    return result


def gif_path_to_css(gif_path: str) -> str:
    """
    Convert frontmatter gif path to CSS url path.
    /img/stalld.gif -> ../img/stalld.gif
    """
    if gif_path.startswith("/img/"):
        return f"..{gif_path}"
    elif gif_path.startswith("img/"):
        return f"../{gif_path}"
    else:
        return gif_path


def extract_frontmatter(filepath: str) -> dict:
    """Extract YAML frontmatter from a markdown file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}
    
    try:
        return yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}


def generate_css_rules() -> list[str]:
    """Generate all CSS hover rules from posts."""
    rules = []
    
    posts = sorted(glob.glob(os.path.join(POSTS_DIR, "*.md")))
    
    for post_path in posts:
        fm = extract_frontmatter(post_path)
        title = fm.get("title")
        gif = fm.get("gif")
        
        if not title or not gif:
            continue
        
        class_name = title_to_class(title)
        css_path = gif_path_to_css(gif)
        
        rule = f"html:has(.{class_name}:hover) body#glitch-target {{ --glitch-bg: url({css_path}); }}"
        rules.append(rule)
    
    return rules


def update_scss(rules: list[str]) -> bool:
    """
    Update the SCSS file with generated rules.
    Returns True if file was modified.
    """
    with open(SCSS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find the markers
    start_idx = content.find(START_MARKER)
    end_idx = content.find(END_MARKER)
    
    if start_idx == -1 or end_idx == -1:
        print(f"ERROR: Could not find markers in {SCSS_FILE}")
        print(f"  Expected: {START_MARKER}")
        print(f"  And: {END_MARKER}")
        return False
    
    # Build new content
    before = content[:start_idx + len(START_MARKER)]
    after = content[end_idx:]
    
    rules_block = "\n" + "\n".join(rules) + "\n"
    
    new_content = before + rules_block + after
    
    if new_content == content:
        print("No changes needed.")
        return False
    
    with open(SCSS_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Updated {SCSS_FILE} with {len(rules)} hover rules.")
    return True


def main():
    print(f"Scanning {POSTS_DIR} for posts with GIF hover images...")
    rules = generate_css_rules()
    print(f"Found {len(rules)} posts with GIF hover images.")
    
    if rules:
        update_scss(rules)
    else:
        print("No posts with gif frontmatter found.")


if __name__ == "__main__":
    main()
