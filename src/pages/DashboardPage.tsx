import { useAuth } from "@/contexts/AuthContext";

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard!</h1>
      {user && <p>You are logged in as: {user.email}</p>}
      {/* Dashboard content goes here */}
    </div>
  );
};

export default DashboardPage; 