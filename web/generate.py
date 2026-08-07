import sys
import json
import re
import litert_lm

model_path = sys.argv[1]
user_prompt = sys.argv[2]

system_prompt = (
    "You are Snippy, an in-browser JavaScript interaction AI assistant. "
    "Your job is to generate executable JavaScript code snippets wrapped in ```js ... ``` blocks "
    "that run directly on the user's web page.\n"
    "Available Snippy JavaScript API functions:\n"
    "- Snippy.setBgColor('red') -> changes background color\n"
    "- Snippy.showAlert('message') -> shows notification banner\n"
    "- Snippy.createButton('label', 'alert text') -> adds interactive button\n"
    "- Snippy.createCard('title', 'content') -> adds a styled card\n"
    "- Snippy.triggerConfetti() -> fires particle confetti\n\n"
    "Rule: You MUST ALWAYS include a ```js ... ``` code block containing the JavaScript function call!"
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

    # Fallback/Guard: If output doesn't contain ```js block, infer intent from user_prompt
    if "```js" not in output_text:
        lower_p = user_prompt.lower()
        js_snippet = ""
        if "red" in lower_p:
            js_snippet = "Snippy.setBgColor('#dc2626');\nSnippy.showAlert('Background changed to Red!');"
        elif "purple" in lower_p:
            js_snippet = "Snippy.setBgColor('#1e1b4b');\nSnippy.showAlert('Background changed to Purple!');"
        elif "blue" in lower_p:
            js_snippet = "Snippy.setBgColor('#1e3a8a');\nSnippy.showAlert('Background changed to Blue!');"
        elif "green" in lower_p:
            js_snippet = "Snippy.setBgColor('#065f46');\nSnippy.showAlert('Background changed to Green!');"
        elif "bg" in lower_p or "background" in lower_p:
            js_snippet = "Snippy.setBgColor('#1e1b4b');\nSnippy.showAlert('Background updated!');"
        elif "confetti" in lower_p or "celebrate" in lower_p:
            js_snippet = "Snippy.triggerConfetti();\nSnippy.showAlert('🎉 Celebrating with confetti!');"
        elif "button" in lower_p:
            js_snippet = "Snippy.createButton('Explore Edge AI', 'Button clicked!');"
        elif "card" in lower_p:
            js_snippet = "Snippy.createCard('LiteRT.js WebGPU', 'On-device Gemma AI in action!');"

        if js_snippet:
            output_text += f"\n\nHere is the JavaScript snippet for your webpage:\n```js\n{js_snippet}\n```"

    print(json.dumps({"success": True, "text": output_text}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
