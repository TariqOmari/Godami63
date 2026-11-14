import React from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Supplier from './pages/Supplier';
import RouteProtector from './components/RouteProtector'; // 1. Import the protector
import Poducts from './pages/Products';
import PurchaseBill from './pages/PurchaseBill';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Scanner from './pages/Scanner';
import Stock from './pages/Stock';
import Customer from './pages/Customer';
import Sales from './pages/Sales';
import SalesInvlices from './pages/SalesInvlices';
import Loans from './pages/Loans';// Import the Loans component
import Capital from './pages/Capital'; // Import the Capital component
import SoldBackReturned from './pages/SoldBackReturned';
import Notification from './pages/Notification'; // Import the Notification component
import Expenses from './pages/Expenses'; // Import the Expenses component
import IncomesReport from './pages/IncomesReport'; // Import the IncomesReport component
export default function App() {
  return (
    <div>
      <Router>
        <Routes>
          {/* Public Route - Anyone can access */}
          <Route path="/login" element={<Login />} />


          {/* Protected Route - Only accessible if token exists in sessionStorage */}
          <Route 
            path="/" 
            element={
              <RouteProtector>
                <Home />
               
              </RouteProtector>
            } 
          />
          <Route 
            path="/suppliers" 
            element={
              <RouteProtector>
                <Supplier />
              </RouteProtector>
            } 
          />


           <Route 
            path="/products" 
            element={
              <RouteProtector>
                <Poducts />
              </RouteProtector>
            } 
          />
          
           <Route 
            path="/purchase-bills" 
            element={
              <RouteProtector>
                <PurchaseBill />
              </RouteProtector>
            } 
          />

            <Route 
            path="/scanner" 
            element={
              <RouteProtector>
                <Scanner />
              </RouteProtector>
            } 
          />
          
            <Route 
            path="/stock" 
            element={
              <RouteProtector>
                <Stock />
              </RouteProtector>
            } 
          />

           <Route 
            path="/customer" 
            element={
              <RouteProtector>
                <Customer />
              </RouteProtector>
            } 
          />

           <Route 
            path="/sales" 
            element={
              <RouteProtector>
                <Sales />
              </RouteProtector>
            } 
          />


 <Route 
            path="/sales-invoices" 
            element={
              <RouteProtector>
                <SalesInvlices />
              </RouteProtector>
            } 
          />

          <Route 
            path="/loans" 
            element={
              <RouteProtector>
                <Loans />
              </RouteProtector>
            } 
          />
  <Route 
            path="/capital" 
            element={
              <RouteProtector>
                <Capital />
              </RouteProtector>
            } 
          />

            <Route 
            path="/back-return" 
            element={
              <RouteProtector>
                <SoldBackReturned />
              </RouteProtector>
            } 
          />

          <Route 
            path="/notification" 
            element={
              <RouteProtector>
                <Notification />
              </RouteProtector>
            } 
          />


            <Route 
            path="/expenses" 
            element={
              <RouteProtector>
                <Expenses />
              </RouteProtector>
            } 
          />


            <Route 
            path="/incomes-report" 
            element={
              <RouteProtector>
                <IncomesReport />
              </RouteProtector>
            } 
          />







        </Routes>


      </Router>
    </div>
  )
}