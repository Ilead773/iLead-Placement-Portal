import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

# Read the exported templates
with open('templates_export.json', 'r', encoding='utf-8') as f:
    templates_data = f.read()

# Read the seed file
with open('seed_deployment_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Build new TEMPLATES block
new_block = "TEMPLATES = json.loads(r'''" + templates_data + "''')"

# Replace old TEMPLATES block using split/join
prefix = "TEMPLATES = json.loads(r'''"
suffix = "''')"

if prefix in content and suffix in content:
    parts = content.split(prefix, 1)
    before = parts[0]
    after = parts[1].split(suffix, 1)[1]
    new_content = before + new_block + after
else:
    new_content = content

if new_content == content:
    print('ERROR: Pattern not found - no replacement made!')
else:
    with open('seed_deployment_data.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS: seed_deployment_data.py updated with premium templates!')
    # Count chars replaced
    old_match = re.search(r"TEMPLATES = json\.loads\(r'''.*?'''\)", content, re.DOTALL)
    if old_match:
        print(f'Old block size: {len(old_match.group())} chars')
    new_match = re.search(r"TEMPLATES = json\.loads\(r'''.*?'''\)", new_content, re.DOTALL)
    if new_match:
        print(f'New block size: {len(new_match.group())} chars')
