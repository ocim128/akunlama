import { Request, Response } from 'express';
import mailgunReader from "../mailgunReader";
import mailgunConfig from "../../config/mailgunConfig";
import cacheControl from "../../config/cacheControl";

const reader = new mailgunReader(mailgunConfig);

interface EmailDetails {
    name: string;
    emailAddress?: string;
    subject: string;
    recipients: string;
}

function formatName(sender: string): [string, string[]] {
    let [name, ...rest] = sender.split(' <');
    return [name, rest];
}

export default function(req: Request, res: Response): Response<any> | void {
    let region = req.query.region as string;
    let key = req.query.key as string;
    
    if (region == null || region === "") {
        return res.status(400).send('{ "error" : "No `region` param found" }');
    }

    if (key == null || key === "") {
        return res.status(400).send('{ "error" : "No `key` param found" }');
    }
    
    reader.getKey({region, key}).then(response => {
        let emailDetails: EmailDetails = {} as EmailDetails;

        // Format and extract the name of the user
        let [name, ...rest] = formatName(response.from);
        emailDetails.name = name;

        // Extract the rest of the email domain after splitting
        if (rest[0].length > 0) {
            emailDetails.emailAddress = ' <' + rest;
        }

        // Extract the subject of the response
        emailDetails.subject = response.subject;

        // Extract the recipients
        emailDetails.recipients = response.recipients;

        // Return with cache control
        res.set('cache-control', cacheControl.static);
        res.status(200).send(emailDetails);
    })
    .catch((e: any) => {
        console.error(`Error getting mail metadata info for /${region}/${key}: `, e);
        res.status(500).send("{error: '"+e+"'}");
    });
}