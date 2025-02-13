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

let newBillContainer;

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: newBill.email }));

  // we have to mock navigation to test it
  const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };

  document.body.innerHTML = NewBillUI();

  newBillContainer = new NewBill({
    document,
    onNavigate,
    store: mockStore,
    localStorage: window.localStorage,
  });
});

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    let handleChangeFile, inputExpenseFile;

    beforeEach(() => {
      handleChangeFile = jest.spyOn(newBillContainer, 'handleChangeFile').mockImplementation();
      inputExpenseFile = screen.getByTestId("file");
      inputExpenseFile.addEventListener("change", handleChangeFile);
    })
    afterEach(() => {
      handleChangeFile.mockRestore();
    })
    describe("When I upload a file with bad format", () => {
      test("Then the file can't be uploaded", async () => {
        const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();

        const file = new File(['bad file format'], newBill.fileName, {type: 'image/svg+xml'})
        userEvent.upload(inputExpenseFile, file)
        
        expect(handleChangeFile).toHaveBeenCalled()
        expect(inputExpenseFile.files).toEqual([])
        expect(console.error.mock.calls[0][0]).toEqual('Bad file format. Please choose .jpg, .jpeg or .png file.')

        consoleErrorMock.mockRestore();
      })
    })
    describe("When I upload a file with the correct format", () => {
      test("Then the file is uploaded", async () => {
        const file = new File(['correct file format'], newBill.fileName, {type: 'image/jpeg'})
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
  describe("When I am in New Bill Page and upload a file correctly", () => {
    test("Then a new bill should be created with the file", async () => {
      const mockStoreCreate = jest.spyOn(mockStore.bills(), 'create');
      const inputExpenseFile = screen.getByTestId("file");
      const file = new File(['dummy content'], newBill.fileName, {type: 'image/png'})
      userEvent.upload(inputExpenseFile, file)
      
      await new Promise(process.nextTick); // Wait file to be uploaded
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', newBill.email);

      expect(mockStoreCreate).toHaveBeenCalled();
      expect(mockStoreCreate).toHaveBeenCalledWith({
        data: formData,
        headers: {
          noContentType: true
        }
      });
      expect(newBillContainer.billId).toBe(newBill.id);
      expect(newBillContainer.fileUrl).toBe(newBill.fileUrl);
      expect(newBillContainer.fileName).toBe(newBill.fileName);
      expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
    })
    describe("When an error occurs on API", () => {
      let consoleErrorMock, inputExpenseFile, file;
      
      beforeEach(async () => {
        consoleErrorMock = jest.spyOn(console, "error").mockImplementation();
        inputExpenseFile = screen.getByTestId("file");
        file = new File(['dummy content'], newBill.fileName, {type: 'image/png'})
      })
      afterEach(() => {
        consoleErrorMock.mockRestore();
      })
      test("Then submit new Bill to API should print 404 message error and redirect to bills", async () => {
        const mockStoreCreate = jest.spyOn(mockStore.bills(), "create")
          .mockImplementationOnce(bill => Promise.reject(new Error("Erreur 404")));
        
        userEvent.upload(inputExpenseFile, file)
        await new Promise(process.nextTick); // Wait file to be uploaded
  
        expect(mockStoreCreate).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 404"))
        expect(newBillContainer.billId).toBeNull();
        expect(newBillContainer.fileUrl).toBeNull();
        expect(newBillContainer.fileName).toBeNull();
        expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
      })
      test("Then submit new Bill to API should print 500 message error and redirect to bills", async () => {
        const mockStoreCreate = jest.spyOn(mockStore.bills(), "create")
          .mockImplementationOnce(bill => Promise.reject(new Error("Erreur 500")));
        
        userEvent.upload(inputExpenseFile, file)
        await new Promise(process.nextTick); // Wait file to be uploaded
  
        expect(mockStoreCreate).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 500"))
        expect(newBillContainer.billId).toBeNull();
        expect(newBillContainer.fileUrl).toBeNull();
        expect(newBillContainer.fileName).toBeNull();
        expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
      })
    })
  })
  describe("When I am in New Bill Page and submit a new bill correctly", () => {
    test("Then the new bill should be uploaded and I should be redirected to Bills listing", async () => {
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
    describe("When an error occurs on API", () => {
      let consoleErrorMock, form;
      beforeEach(async () => {
        consoleErrorMock = jest.spyOn(console, "error")
          .mockImplementation();
        form = screen.getByTestId("form-new-bill");
      })
      afterEach(() => {
        consoleErrorMock.mockRestore()
      })
      test("Then submit new Bill to API should print 404 message error and redirect to bills", async () => {
        const mockStoreUpdate = jest.spyOn(mockStore.bills(), "update")
          .mockImplementationOnce(bill => Promise.reject(new Error("Erreur 404")));

        fireEvent.submit(form);
        await new Promise(process.nextTick);

        expect(mockStoreUpdate).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 404"))
        expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
      })
      test("Then submit new Bill to API should print 500 message error and redirect to bills", async () => {
        const mockStoreUpdate = jest.spyOn(mockStore.bills(), "update")
          .mockImplementationOnce(bill => Promise.reject(new Error("Erreur 500")));
        
        fireEvent.submit(form);
        await new Promise(process.nextTick);

        expect(mockStoreUpdate).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toEqual(new Error("Erreur 500"))
        expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
      })
    })
  })
})
