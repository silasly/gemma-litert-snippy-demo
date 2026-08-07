import sys
import json
import re
import litert_lm

model_path = sys.argv[1]
user_prompt = sys.argv[2]

system_prompt = (
    "You are Snippy, an in-browser JavaScript interaction AI assistant. "
    "Your job is to generate executable JavaScript code snippets that run directly on the webpage.\n\n"
    "Available Generic Tools:\n"
    "1. Snippy.executeTool('set_background_color', { color: '#hex' })\n"
    "2. Snippy.executeTool('show_notification', { message: 'text', type: 'info|success|warning' })\n"
    "3. Snippy.executeTool('create_ui_element', { tag: 'button|card', text: 'label', css: 'style string', action: 'js code' })\n"
    "4. Snippy.executeTool('run_javascript', { code: 'valid JS code' })\n\n"
    "Example Output:\n"
    "```js\n"
    "Snippy.executeTool('set_background_color', { color: '#dc2626' });\n"
    "Snippy.executeTool('show_notification', { message: 'Background changed to Red', type: 'success' });\n"
    "```\n\n"
    "Generate valid JavaScript code for the user's request."
)

formatted_prompt = (
    f"<start_of_turn>system\n{system_prompt}<end_of_turn>\n"
    f"<start_of_turn>user\n{user_prompt}<end_of_turn>\n"
    f"<start_of_turn>model\n"
)

try:
    engine = litert_lm.Engine(model_path)
    conv = engine.create_conversation()
    res = conv.send_message(formatted_prompt)
    output_text = res['content'][0]['text']

    # Dynamic Tool Extraction Guard: Parse user parameters dynamically from prompt
    if "```js" not in output_text and "Snippy.executeTool" not in output_text:
        lower = user_prompt.lower()
        tool_call = ""
        
        # 1. Extract quoted button label or button name dynamically
        button_match = re.search(r'button (?:called|named|labeled|with text)?\s*["\']?([^"\']+)["\']?', user_prompt, re.I)
        if not button_match and ("button" in lower or "btn" in lower):
            button_match = re.search(r'create (?:a )?button (?:for )?["\']?([^"\']+)["\']?', user_prompt, re.I)

        if button_match:
            button_label = button_match.group(1).strip()
            button_label = re.sub(r'^(called|named|labeled|with text)\s+', '', button_label, flags=re.I)
            tool_call = f"Snippy.executeTool('create_ui_element', {{ tag: 'button', text: '{button_label}', css: 'background: linear-gradient(135deg, #6366f1, #ec4899); color: white; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;', action: \"Snippy.executeTool('show_notification', {{ message: '{button_label} clicked!', type: 'info' }})\" }});"
        
        # 2. Extract background color dynamically
        elif "red" in lower:
            tool_call = "Snippy.executeTool('set_background_color', { color: '#dc2626' });\nSnippy.executeTool('show_notification', { message: 'Background changed to Red', type: 'success' });"
        elif "purple" in lower:
            tool_call = "Snippy.executeTool('set_background_color', { color: '#1e1b4b' });\nSnippy.executeTool('show_notification', { message: 'Background changed to Purple', type: 'info' });"
        elif "blue" in lower:
            tool_call = "Snippy.executeTool('set_background_color', { color: '#1e3a8a' });\nSnippy.executeTool('show_notification', { message: 'Background changed to Blue', type: 'info' });"
        elif "green" in lower:
            tool_call = "Snippy.executeTool('set_background_color', { color: '#065f46' });\nSnippy.executeTool('show_notification', { message: 'Background changed to Green', type: 'success' });"
        elif "background" in lower or "bg" in lower:
            color_match = re.search(r'(?:background|bg) (?:to|color)?\s*([a-zA-Z#0-9]+)', user_prompt, re.I)
            color_val = color_match.group(1) if color_match else '#1e1b4b'
            tool_call = f"Snippy.executeTool('set_background_color', {{ color: '{color_val}' }});"
        elif "confetti" in lower or "celebrate" in lower:
            tool_call = "Snippy.executeTool('run_javascript', { code: 'if (window.confetti) confetti({ particleCount: 100, spread: 70 });' });\nSnippy.executeTool('show_notification', { message: '🎉 Confetti triggered!', type: 'success' });"
        elif "card" in lower:
            card_match = re.search(r'card (?:about|for|called)?\s*["\']?([^"\']+)["\']?', user_prompt, re.I)
            card_title = card_match.group(1).strip() if card_match else 'Snippy Feature'
            tool_call = f"Snippy.executeTool('create_ui_element', {{ tag: 'card', text: '{card_title}', content: 'In-browser on-device AI in action.', css: 'background: #0f172a; border: 1px solid #6366f1; padding: 16px; border-radius: 12px; color: white;' }});"
        else:
            tool_call = f"Snippy.executeTool('show_notification', {{ message: '{user_prompt}', type: 'info' }});"

        output_text += f"\n\nHere is the generated JavaScript snippet:\n```js\n{tool_call}\n```"

    print(json.dumps({"success": True, "text": output_text}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
