import Spinner from '../../../components/Spinner';

export default function PasswordSettings() {
  return (
    <div>
      <h2>Password Change</h2>
      <p>Change your password here.</p>
      {loading ? (
        <Spinner size={40} className="my-12" />
      ) : error ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div>
          <h3>Current Password</h3>
          <input type="password" />
          <h3>New Password</h3>
          <input type="password" />
          <h3>Confirm New Password</h3>
          <input type="password" />
          <button>Change Password</button>
        </div>
      )}
    </div>
  );
} 