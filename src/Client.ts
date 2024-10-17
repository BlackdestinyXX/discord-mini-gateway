import { request } from 'undici';

class Client {

    token: string = "";

    costructor(token: string) {
        this.token = token;
    }

    async connect() {

        const { statusCode, body } = await request('http://localhost:3000', {
            headers: {
                'Authorization': `Bot ${this.token}`
            }
        })

        console.log(statusCode, body);
        
    }
}