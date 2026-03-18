export default async function handler(req, res) {

    if (req.method !== 'POST') {

        return res.status(405).json({ error: 'Metoda není povolena' });

    }



    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {

        return res.status(500).json({ error: 'API klíč není nastaven na serveru.' });

    }



    try {

        const { parts, systemPrompt, useJson } = req.body;



        const userText = parts.map(p => {

            if (typeof p === 'string') return p;

            if (p.text) return p.text;

            return '';

        }).filter(Boolean).join('\n');



        const messages = [];

        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        messages.push({ role: 'user', content: userText });



        const payload = {

            model: 'gpt-4o',

            messages,

            max_tokens: 1024,

        };



        if (useJson) {

            payload.response_format = { type: 'json_object' };

        }



        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Authorization': `Bearer ${apiKey}`

            },

            body: JSON.stringify(payload)

        });



        const data = await response.json();



        if (!response.ok) {

            return res.status(response.status).json({ error: data.error?.message || 'Chyba od API' });

        }



        return res.status(200).json({ text: data.choices[0].message.content });



    } catch (err) {

        return res.status(500).json({ error: err.message });

    }

}
