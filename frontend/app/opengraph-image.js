import { ImageResponse } from 'next/og';

export const alt = 'RoundTable Email Studio — communications and campaign management';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #062f24 0%, #075c42 58%, #0b7a53 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          padding: '72px 82px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 470,
            height: 470,
            border: '2px solid rgba(207, 238, 221, 0.16)',
            borderRadius: 999,
            right: -125,
            top: -155,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 330,
            height: 330,
            border: '2px solid rgba(207, 238, 221, 0.12)',
            borderRadius: 999,
            right: 65,
            bottom: -220,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                background: '#eaf8f1',
                marginRight: 22,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px dashed #0b7a53',
                  borderRadius: 999,
                }}
              >
                <div style={{ width: 15, height: 15, borderRadius: 999, background: '#0b7a53' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px' }}>RoundTable</div>
              <div style={{ fontSize: 15, color: '#b8ddcc', letterSpacing: '3px', marginTop: 5 }}>EMAIL STUDIO</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-2.5px' }}>
              <span>Better communication,</span>
              <span>built around your community.</span>
            </div>
            <div style={{ fontSize: 24, color: '#cfeedd', marginTop: 28, lineHeight: 1.45 }}>
              Compose, personalise and deliver thoughtful campaigns from one secure workspace.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', color: '#a9d7c2', fontSize: 18 }}>
            <span>Campaigns</span><span style={{ margin: '0 16px', color: '#5ab28c' }}>•</span>
            <span>Contact Groups</span><span style={{ margin: '0 16px', color: '#5ab28c' }}>•</span>
            <span>Mailjet + Resend</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
