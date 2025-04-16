import { Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header'; // We will create this next

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow p-4 md:p-6 lg:p-8">
        <Outlet /> {/* Child routes will render here */}
      </main>
      {/* Add a Footer component here if needed */}
    </div>
  );
};

export default MainLayout; 