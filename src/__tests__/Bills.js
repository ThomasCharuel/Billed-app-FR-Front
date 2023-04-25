/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'

import {screen, waitFor} from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";
import Bills from '../containers/Bills.js';

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass('active-icon')
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    describe("And click on Nouvelle note de frais", () => {
      test("Then should redirect to new Bill page", async () => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

        // we have to mock navigation to test it
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };
        
        document.body.innerHTML = BillsUI({ data: bills });

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleClickNewBill = jest.spyOn(billsContainer, "handleClickNewBill")
        const newBillButton = screen.getByTestId('btn-new-bill')
        newBillButton.addEventListener("click", handleClickNewBill)
        userEvent.click(newBillButton)

        expect(handleClickNewBill).toBeCalled()
        await new Promise(process.nextTick);
        expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
      })
    })
    describe("And click on Eye Icon", () => {
      test("Then modal with file should open", async () => {
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

        // we have to mock navigation to test it
        const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) };
        
        document.body.innerHTML = BillsUI({ data: bills });

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const eyeIcons = screen.getAllByTestId("icon-eye")
        
        // Check that urls are correct
        bills.map(b => b.fileUrl)
        expect(eyeIcons.length).toEqual(bills.length)
        expect(eyeIcons.map(e => e.getAttribute('data-bill-url')).sort())
          .toEqual(bills.map(b => b.fileUrl).sort())

        // Check that modal opens on click
        const handleClickEyeIcon = jest.spyOn(billsContainer, "handleClickIconEye")

        window.$.fn.modal = jest.fn()

        eyeIcons.forEach(eyeIcon => {
          userEvent.click(eyeIcon)
        })
        expect(handleClickEyeIcon).toHaveBeenCalledTimes(eyeIcons.length)
      })
    })
  })
})

// Test d'intégration GET
describe("Given I am connected as an employee", () => {
  describe("When I navigate to Bills Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
    })
    test("fetches bills from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('tbody'))
      const tbody = screen.getByTestId('tbody')

      // Check matching between bills in HTML and mock data
      expect(tbody.children.length).toEqual(bills.length)
    })
    describe("When an error occurs on API", () => {
      test("Then fetches bills from an API and fails with 404 message error", async () => {
        const mockStoreBills = jest.spyOn(mockStore.bills(), "list")
          .mockImplementationOnce(() => Promise.reject(new Error("Erreur 404")))
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        
        expect(mockStoreBills).toHaveBeenCalled();
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })
      test("Then fetches messages from an API and fails with 500 message error", async () => {
        const mockStoreBills = jest.spyOn(mockStore.bills(), "list")
          .mockImplementationOnce(() => Promise.reject(new Error("Erreur 500")))
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);

        expect(mockStoreBills).toHaveBeenCalled();
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})