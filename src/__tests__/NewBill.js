/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'

import { fireEvent, screen } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import NewBillUI from "../views/NewBillUI.js"
import { newBill } from "../fixtures/bills.js"
import { ROUTES } from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import NewBill from "../containers/NewBill.js"
import mockStore from "../__mocks__/store"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    describe("When I upload a file with the bad format", () => {
      test("Then the file can't be uploaded", async () => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: newBill.email }));

        // we have to mock navigation to test it
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };
        
        document.body.innerHTML = NewBillUI();

        const newBillContainer = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();
        const handleChangeFile = jest.spyOn(newBillContainer, 'handleChangeFile').mockImplementation();

        const inputExpenseFile = screen.getByTestId("file");
        const file = new File(['bad file format'], newBill.fileName, {type: 'image/svg+xml'})
        inputExpenseFile.addEventListener("change", handleChangeFile)
        userEvent.upload(inputExpenseFile, file)
        
        expect(handleChangeFile).toHaveBeenCalled()
        expect(inputExpenseFile.files).toEqual([])
        expect(console.error.mock.calls[0][0]).toEqual('Bad file format. Please choose .jpg, .jpeg or .png file.')

        consoleErrorMock.mockRestore();
      })
    })
    describe("When I upload a file with the correct format", () => {
      test("Then the file is uploaded", async () => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: newBill.email }));

        // we have to mock navigation to test it
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };
        
        document.body.innerHTML = NewBillUI();

        const newBillContainer = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleChangeFile = jest.spyOn(newBillContainer, 'handleChangeFile').mockImplementation();
        const inputExpenseFile = screen.getByTestId("file");
        const file = new File(['correct file format'], newBill.fileName, {type: 'image/jpeg'})
        inputExpenseFile.addEventListener("change", handleChangeFile)
        userEvent.upload(inputExpenseFile, file)
        await new Promise(process.nextTick); // Wait file to be uploaded

        expect(handleChangeFile).toHaveBeenCalled()
        expect(inputExpenseFile.files[0].name).toEqual(newBill.fileName)
        expect(inputExpenseFile.files[0]).toEqual(file)
      })
    })
  })
})

// Test d'intégration POST
describe("Given I am connected as an employee", () => {

  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: newBill.email }));

  // we have to mock navigation to test it
  const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };

  describe("When I am in New Bill Page and submit correctly", () => {
    test("Then the new bill should be uploaded and I should be redirected to Bills listing", async () => {
      document.body.innerHTML = NewBillUI();

      const newBillContainer = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Fill form
      const inputExpenseType = screen.getByTestId("expense-type");
      fireEvent.change(inputExpenseType, { target: { value: newBill.type } });
      expect(inputExpenseType.value).toBe(newBill.type);

      const inputExpenseName = screen.getByTestId("expense-name");
      fireEvent.change(inputExpenseName, { target: { value: newBill.name } });
      expect(inputExpenseName.value).toBe(newBill.name);

      const inputExpenseDate = screen.getByTestId("datepicker");
      fireEvent.change(inputExpenseDate, { target: { value: newBill.date } });
      expect(inputExpenseDate.value).toBe(newBill.date);

      const inputExpenseAmount = screen.getByTestId("amount");
      fireEvent.change(inputExpenseAmount, { target: { value: newBill.amount } });
      expect(inputExpenseAmount.value).toEqual(String(newBill.amount));

      const inputExpenseVAT = screen.getByTestId("vat");
      fireEvent.change(inputExpenseVAT, { target: { value: newBill.vat } });
      expect(inputExpenseVAT.value).toBe(String(newBill.vat));

      const inputExpensePCT = screen.getByTestId("pct");
      fireEvent.change(inputExpensePCT, { target: { value: newBill.pct } });
      expect(inputExpensePCT.value).toBe(String(newBill.pct));

      const inputExpenseCommentary = screen.getByTestId("commentary");
      fireEvent.change(inputExpenseCommentary, { target: { value: newBill.commentary } });
      expect(inputExpenseCommentary.value).toBe(newBill.commentary);

      const inputExpenseFile = screen.getByTestId("file");
      const file = new File(['dummy content'], newBill.fileName, {type: 'image/png'})
      userEvent.upload(inputExpenseFile, file)
      await new Promise(process.nextTick); // Wait file to be uploaded
      expect(inputExpenseFile.files[0]).toEqual(file);

      // Submit
      const mockedUpdateBill = jest.spyOn(newBillContainer, 'updateBill');
      const handleSubmit = jest.spyOn(newBillContainer, 'handleSubmit')
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit)
      fireEvent.submit(form);
      
      expect(handleSubmit).toHaveBeenCalled();
      expect(mockedUpdateBill).toHaveBeenCalled();
      expect(mockedUpdateBill).toHaveBeenCalledWith({
        email: newBill.email,
        type: newBill.type,
        name:  newBill.name,
        amount: newBill.amount,
        date:  newBill.date,
        vat: newBill.vat,
        pct: newBill.pct,
        commentary: newBill.commentary,
        fileUrl: newBill.fileUrl,
        fileName: newBill.fileName,
        status: 'pending'
      });
      expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
    })
  })
  describe("When an error occurs on API", () => {
    let consoleErrorMock;
    beforeEach(async () => {
      document.body.innerHTML = NewBillUI();
      
      const newBillContainer = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      
      jest.spyOn(mockStore, "bills")
      consoleErrorMock = jest.spyOn(console, "error")
        .mockImplementation();
    })
    afterEach(() => {
      consoleErrorMock.mockRestore()
    })
    test("Then submit new Bill to API should print 404 message error and redirect to bills", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          update : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);
      await new Promise(process.nextTick);
      expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 404"))
      expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
    })
    test("Then submit new Bill to API should print 500 message error and redirect to bills", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          update : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})
      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);
      await new Promise(process.nextTick);
      expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 500"))
      expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
    })
  })
})
