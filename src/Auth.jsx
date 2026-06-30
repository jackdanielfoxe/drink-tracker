import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase, AUTH_REDIRECT_URL } from './supabaseClient'

// T&P branding theme for the Supabase Auth UI button
const tpTheme = {
  default: {
    colors: {
      brand: '#182B39',          // navy
      brandAccent: '#CDA065',    // tan
      brandButtonText: '#FAF9F7',// cream
      defaultButtonBackground: '#FFFFFF',
      defaultButtonBackgroundHover: '#FAF9F7',
      defaultButtonBorder: '#E2E6E9',
      defaultButtonText: '#182B39',
      inputBackground: '#FFFFFF',
      inputBorder: '#E2E6E9',
      inputText: '#182B39',
    },
    radii: {
      borderRadiusButton: '14px',
      buttonBorderRadius: '14px',
      inputBorderRadius: '14px',
    },
    fonts: {
      bodyFontFamily: `'Segoe UI', system-ui, sans-serif`,
      buttonFontFamily: `'Segoe UI', system-ui, sans-serif`,
    },
  },
}

export default function Auth() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <a className="auth-logo-link" href="https://titandpecker.com" aria-label="Tit & Pecker home">
          <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="auth-logo" />
        </a>
        <p className="eyebrow">Tit &amp; Pecker</p>
        <h1 className="auth-title">Drink Tracker</h1>
        <p className="auth-subtitle">Sign in to log your rounds.</p>

        <SupabaseAuth
          supabaseClient={supabase}
          onlyThirdPartyProviders
          providers={['google']}
          redirectTo={AUTH_REDIRECT_URL}
          appearance={{
            theme: ThemeSupa,
            variables: tpTheme,
          }}
          localization={{
            variables: {
              sign_in: { social_provider_text: 'Sign in with {{provider}}' },
            },
          }}
        />
      </div>
    </div>
  )
}
