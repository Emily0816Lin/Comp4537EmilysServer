// Disclosure: I used ChatGPT to assist with the content of this assignment.

const http = require('http');
const messages = require('./lang/en/en');

// Class to manage the dictionary data
class DictionaryManager {
    constructor() {
        this.dictionary = [];
    }

    // Method to add a new word to the dictionary
    addWord(word, definition, requestCount) {
        const existingEntry = this.dictionary.find(item => item.word.toLowerCase() === word.toLowerCase());
        if (existingEntry) {
            return {
                success: false,
                message: messages.errors.wordExists.replace('%1', word),
                requestCount: requestCount,
            };
        } else {
            this.dictionary.push({ word, definition });
            return {
                success: true,
                message: messages.success.newEntryRecorded.replace('%1', word).replace('%2', definition).replace('%3', requestCount),
                requestCount: requestCount,
                totalEntries: this.dictionary.length
            };
        }
    }

    // Method to find a word's definition in the dictionary
    findWord(word) {
        return this.dictionary.find(item => item.word.toLowerCase() === word.toLowerCase());
    }

    getTotalEntries() {
        return this.dictionary.length;
    }
}

// Class to handle messages and template replacements
class MessageHandler {
    static formatMessage(template, ...values) {
        let formattedMessage = template;
        values.forEach((value, index) => {
            formattedMessage = formattedMessage.replace(`%${index + 1}`, value);
        });
        return formattedMessage;
    }
}

// Main server class to handle requests and responses
class DictionaryServer {
    constructor() {
        this.dictionaryManager = new DictionaryManager();
        this.requestCount = 0;
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
    }

    // Method to handle incoming requests
    handleRequest(req, res) {
        // res.setHeader('Content-Type', 'application/json');


        // Add CORS headers to allow cross-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === 'GET' && req.url.startsWith('/api/definitions')) {
            this.handleGetRequest(req, res);
        } else if (req.method === 'POST' && req.url === '/api/definitions') {
            this.handlePostRequest(req, res);
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: messages.errors.endpointNotFound }));
        }
    }

    // Method to handle GET requests
    handleGetRequest(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const word = url.searchParams.get('word');
        const entry = this.dictionaryManager.findWord(word);
        this.requestCount++;

        if (entry) {
            res.statusCode = 200;
            res.end(JSON.stringify({
                message: MessageHandler.formatMessage(messages.info.wordDefinition, entry.word, entry.definition),
                requestCount: this.requestCount
            }));
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({
                message: MessageHandler.formatMessage(messages.errors.wordNotFound, word),
                requestCount: this.requestCount
            }));
        }
    }

    // Method to handle POST requests
    handlePostRequest(req, res) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const { word, definition } = JSON.parse(body);
            this.requestCount++;

            if (!word || !definition || /\d/.test(word)) {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    message: messages.errors.invalidInput,
                    requestCount: this.requestCount,
                }));
                return;
            }

            const result = this.dictionaryManager.addWord(word, definition, this.requestCount);
            if (result.success) {
                res.statusCode = 201;
                res.end(JSON.stringify({
                    message: result.message,
                    requestCount: this.requestCount,
                    totalEntries: result.totalEntries
                }));
            } else {
                res.statusCode = 409;
                res.end(JSON.stringify({
                    message: result.message,
                    requestCount: this.requestCount,
                }));
            }
        });
    }

    // Method to start the server
    // start(port) {
    //     this.server.listen(port, () => {
    //         console.log(`Server is running on port ${port}`);
    //     });
    // }


    // Method to start the server
    start(port) {
        const PORT = port || process.env.PORT || 3000; // Use the Heroku-assigned port if available
        this.server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
}

// Initialize and start the server
const dictionaryServer = new DictionaryServer();
dictionaryServer.start();
