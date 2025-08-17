import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GPT_MODEL = "gpt-4o-mini-2024-07-18";

export class Chat {
  private prev: string | undefined = undefined;

  async prompt(role: string, message: string) {
    const payload: any = {
      model: GPT_MODEL,
      input: [
        {
          role,
          content: message,
        },
      ],
    };

    if (this.prev) {
      payload.previous_response_id = this.prev;
    }

    const response = await client.responses.create(payload);
    this.prev = response.id;
    return response;
  }

  reset() {
    this.prev = undefined; // start fresh conversation
  }
}

