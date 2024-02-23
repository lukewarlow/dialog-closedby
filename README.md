Proposal: https://github.com/whatwg/html/issues/9373

Code based on https://github.com/keithamus/invoker-buttons-proposal

This adds a new closedBy property and closedby attribute to the HTMLDialogElement.

| Keyword        | Description |
|----------------|---------------|
| 'none'         | No automatic closing. |
| 'closerequest' | Close watchers trigger close |
| 'any'          | Light dismiss and close watchers trigger close |

The default is an 'auto' behaviour with no matching keyword. This maintains existing behaviour, 'closerequest' for modal dialogs, else 'none'.