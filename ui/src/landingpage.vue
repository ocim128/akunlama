<template>
  <div class="landing-page">
    <nav class="landing-navigation">
      <router-link to="/kittenrouter">
        <img
          class="landing-nav-main-logo"
          src="@/assets/kitten_router.png"
          alt="Kitten Router Logo"
        />
      </router-link>
    </nav>

    <header class="header-gradient-background">
      <div class="header">
        <img class="logo" src="@/assets/inbox_kitten.png" alt="Inbox Kitten Logo" />
        <h1>
          Open-Source
          <span> Disposable Email</span>
        </h1>
        <h2>(Served by Serverless Kittens)</h2>
      </div>

      <section class="email-selection">
        <form @submit.prevent="goToInbox">
          <div class="input-box">
            <input
              class="input-email"
              name="email"
              aria-label="email"
              type="text"
              v-model="randomName"
              id="email-input"
            />
            <div
              class="input-suffix"
              id="div-domain"
              data-clipboard-target="#email-input"
            >@{{ domain }}</div>
          </div>
          <div class="submit-box">
            <input type="submit" class="submit" value="Get Mail Nyow!" />
          </div>
        </form>
      </section>
    </header>

    <main class="info-guide mx-a my-0 p-2" style="max-width: 1240px;">
      <div class="pure-g mx-a" style="max-width: 1000px;">
        <div class="pure-u-1-1">
          <section class="p-1">
            <h3>
              <i class="fas fa-exclamation-triangle"></i>
              PSA: Please use Akunlama for testing or non-critical emails only.
            </h3>
            <p>
              <a
                href="https://cvf.shopee.co.id/file/5756a10f6078aa7ab5d0d634a89a0607"
                target="_blank"
                rel="noopener noreferrer"
              >
                For faster Instagram login, you can try logging in without your email and
                password. Simply use cookies. Check out this video.
              </a>
            </p>
          </section>
        </div>
      </div>
      <div class="pure-g mx-a my-1" style="max-width: 1000px;">
        <div class="pure-u-1-2">
          <section class="p-1">
            <h3>
              <i class="fas fa-mail-bulk"></i> Use any inbox to avoid spam
            </h3>
            <p>
              Use Akunlama when you don't want to be spammed by revealing your real email
              address.
            </p>
          </section>
        </div>
        <div class="pure-u-1-2">
          <section class="p-1">
            <h3>
              <i class="fas fa-trash-alt"></i> Email Auto-Deletes
            </h3>
            <p>
              Akunlama.com provides temporary email addresses that automatically delete
              themselves after 24 hours of receiving a message.
            </p>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import $ from 'jquery'
import config from '@/../config/apiconfig.js'
import 'normalize.css'
import ClipboardJS from 'clipboard'
import { generate } from 'random-words'

export default {
  name: 'LandingPage',
  data() {
    return {
      randomName: ''
    }
  },
  mounted() {
    this.randomName = this.generateRandomName()

    // Initialize ClipboardJS on the domain div
    this.$clipboard = new ClipboardJS('#div-domain', {
      text: () => {
        if (this.randomName.includes(`@${config.domain}`)) {
          return this.randomName
        }
        return `${this.randomName}@${config.domain}`
      }
    })

    this.$clipboard.on('success', (e) => {
      $('#email-input').select()
      $('#div-domain').addClass('tooltipped tooltipped-s')
      $('#div-domain').attr('aria-label', 'Copied!')
      $('#div-domain').on('mouseleave', function () {
        $('#div-domain').removeClass('tooltipped tooltipped-s')
        $('#div-domain').removeAttr('aria-label')
      })
    })
  },
  beforeDestroy() {
    if (this.$clipboard) {
      this.$clipboard.destroy()
    }
  },
  computed: {
    domain() {
      return config.domain
    }
  },
  methods: {
    generateRandomName() {
      // Generate a random name composed of two words and a two-digit number
      return (
        generate({
          exactly: 1,
          wordsPerString: 2,
          separator: '-'
        }) + '-' + Math.floor(Math.random() * 90 + 10)
      )
    },
    goToInbox() {
      this.$router.push({
        name: 'Inbox',
        params: {
          email: this.randomName
        }
      })
    },
    goToKittenRouter() {
      this.$router.push({ path: '/kittenrouter' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import url('https://use.fontawesome.com/releases/v5.3.1/css/all.css');
@import 'scss/landingpage.scss';
@import 'primer-tooltips/index.scss';

.landing-navigation {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  padding-top: 1rem;

  .landing-nav-main-logo {
    width: 8rem;
    padding-top: 7rem;
    padding-right: 4rem;
    z-index: 2;
  }

  @media only screen and (max-width: 470px) {
    .landing-nav-main-logo {
      padding-right: 4rem;
      width: 5rem;
      z-index: 3;
    }
  }
}

@media only screen and (max-width: 800px) {
  .landing-navigation {
    padding-top: 140px;
  }
}
</style>
