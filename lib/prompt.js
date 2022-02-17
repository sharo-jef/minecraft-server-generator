export class Prompt {
    /** @type {import('prompts').PromptObject} */
    prompt = {};
    property = null;
    /** @param {string} property */
    constructor(property) {
        if (!property) {
            return;
        }
        this.property = property;
        this.prompt.name = property.replace(/(-|\.)(.)/g, match => match[1].toUpperCase());
        this.prompt.message = property.replace(/^[a-z]/g, match => match.toUpperCase()).replace(/-|\./g, () => ' ');
    }
    /** @param {string} name */
    name(name) {
        this.prompt.name = name;
        return this;
    }
    /** @param {import('prompts').PromptType} type */
    type(type) {
        this.prompt.type = type;
        return this;
    }
    /** @param {boolean} active */
    active(active) {
        this.prompt.active = active;
        return this;
    }
    /** @param {string[]|number[]} choices */
    choices(choices) {
        this.prompt.choices = choices;
        return this;
    }
    /** @param {string|number} initial */
    initial(initial) {
        this.prompt.initial = initial;
        return this;
    }
    /** @param {string} message */
    message(message) {
        this.prompt.message = message;
        return this;
    }
}
