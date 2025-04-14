import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Space Tech Area Calculator",
  description: "Calculate area with a futuristic space tech interface",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Hotjar Tracking Code for v0ATXApp */}
        <Script id="hotjar-tracking" strategy="afterInteractive">
          {`
           (function(h,o,t,j,a,r){
               h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
               h._hjSettings={hjid:6366681,hjsv:6};
               a=o.getElementsByTagName('head')[0];
               r=o.createElement('script');r.async=1;
               r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
               a.appendChild(r);
           })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
         `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}


import './globals.css'