interface ShareConfig {
    githubForkLink: string
    githubAriaLabel: string
    tweetMessage: string
    tweetDataUrl: string
    mainURL: string
    enabled: boolean
}

const shareConfig: ShareConfig = {
    githubForkLink: "https://github.com/uilicious/inboxkitten/fork",
    githubAriaLabel: "Fork uilicious/inboxkitten on GitHub",
    tweetMessage: "InboxKitten is amazing! Check it out here at",
    tweetDataUrl: "https://inboxkitten.com",
    mainURL: "https://inboxkitten.com",
    enabled: true
}

export default shareConfig
