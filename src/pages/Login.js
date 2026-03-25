// Login Screen Component
export function renderLogin(onSuccess) {
    const el = document.getElementById('login-screen');
    el.innerHTML = `
    <div class="login-wrapper" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary);">
      <div class="login-card" style="background: var(--bg-card); padding: 40px; border-radius: 12px; border: 1px solid var(--border-color); width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">HSSE Dashboard</h1>
          <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Sign in to securely access operations intelligence.</p>
        </div>
        
        <form id="login-form">
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Username</label>
            <input type="text" id="username" placeholder="Enter username" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); outline: none; transition: border-color 0.2s;" required />
          </div>
          
          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Password</label>
            <input type="password" id="password" placeholder="Enter password" style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); outline: none; transition: border-color 0.2s;" required />
          </div>
          
          <div id="login-error" style="color: var(--accent-red); font-size: 13px; margin-bottom: 16px; display: none; text-align: center;">Invalid credentials. Please try again.</div>
          
          <button type="submit" style="width: 100%; background: var(--accent-blue); color: #fff; border: none; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: opacity 0.2s;">
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        
        if (user === 'Solxadmin' && pass === 'admin') {
            document.getElementById('login-error').style.display = 'none';
            onSuccess();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    });

    // Add input focus highlight logic
    const inputs = el.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => input.style.borderColor = 'var(--accent-blue)');
        input.addEventListener('blur', () => input.style.borderColor = 'var(--border-color)');
    });
}
