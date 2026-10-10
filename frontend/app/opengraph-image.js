import { ImageResponse } from 'next/og';

export const alt = 'HeyMailer — email campaign services for growing teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function MailMark() {
  return (
    <div style={{ width: 76, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 22, background: '#ffffff', position: 'relative', boxShadow: '0 16px 38px rgba(0, 0, 0, 0.18)' }}>
      <div style={{ width: 43, height: 31, display: 'flex', border: '4px solid #087052', borderRadius: 7, position: 'relative' }}>
        <div style={{ width: 27, height: 27, borderLeft: '4px solid #087052', borderBottom: '4px solid #087052', transform: 'rotate(-45deg)', position: 'absolute', left: 4, top: -13 }} />
      </div>
      <div style={{ width: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, background: '#fbbf24', border: '3px solid #ffffff', position: 'absolute', right: -4, top: -4 }}>
        <div style={{ width: 7, height: 4, borderLeft: '2px solid #064e3b', borderBottom: '2px solid #064e3b', transform: 'rotate(-45deg)', marginTop: -2 }} />
      </div>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: 'linear-gradient(132deg, #042f24 0%, #075c42 52%, #0b8a60 100%)', color: '#ffffff', fontFamily: 'Arial, sans-serif', padding: '66px 78px' }}>
        <div style={{ width: 520, height: 520, borderRadius: 999, background: 'rgba(255,255,255,0.055)', position: 'absolute', right: -160, top: -190 }} />
        <div style={{ width: 280, height: 280, borderRadius: 999, border: '2px solid rgba(255,255,255,0.12)', position: 'absolute', right: 80, bottom: -190 }} />
        <div style={{ width: 170, height: 120, borderRadius: 24, border: '2px solid rgba(209,250,229,0.16)', transform: 'rotate(-10deg)', position: 'absolute', right: 98, top: 195 }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MailMark />
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px' }}>HeyMailer</div>
              <div style={{ fontSize: 14, color: '#a7f3d0', letterSpacing: '3.5px', marginTop: 5 }}>EMAIL SERVICES</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 850 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72, lineHeight: 1.02, fontWeight: 850, letterSpacing: '-3px' }}>
              <span>Reach more people.</span>
              <span style={{ color: '#a7f3d0' }}>Build better relationships.</span>
            </div>
            <div style={{ fontSize: 24, color: '#d1fae5', marginTop: 25, lineHeight: 1.4 }}>
              Professional email campaigns, audience management and reliable delivery—all in one place.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 17, fontWeight: 700 }}>
            {['Campaigns', 'Audience', 'Templates', 'Delivery'].map((label, index) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && <span style={{ margin: '0 15px', color: '#52c99a' }}>•</span>}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
