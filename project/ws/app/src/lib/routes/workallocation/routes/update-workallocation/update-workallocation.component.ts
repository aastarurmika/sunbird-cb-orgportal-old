import { Component, OnInit } from '@angular/core'
import { FormGroup, Validators, FormBuilder, FormArray, FormControl } from '@angular/forms'
import { AllocationService } from '../../services/allocation.service'
import { Router, ActivatedRoute } from '@angular/router'
import { ExportAsService, ExportAsConfig } from 'ngx-export-as'
import { MatSnackBar } from '@angular/material'
import { DatePipe } from '@angular/common'

@Component({
  selector: 'ws-app-update-workallocation',
  templateUrl: './update-workallocation.component.html',
  styleUrls: ['./update-workallocation.component.scss'],
  providers: [DatePipe],
})
export class UpdateWorkallocationComponent implements OnInit {
  tabsData!: any[]
  userslist!: any[]
  currentTab = 'officer'
  sticky = false
  newAllocationForm: FormGroup
  formdata = {
    fname: '',
    email: '',
    position: '',
    rolelist: [
      {
        name: '',
        childNodes: '',
      },
    ],
  }
  similarUsers!: any []
  similarRoles!: any []
  selectedUser: any
  selectedRole: any
  ralist: any [] = []
  archivedlist: any [] = []

  config: ExportAsConfig = {
    type: 'pdf',
    elementIdOrContent: 'mytable',
    options: {
      jsPDF: {
        orientation: 'landscape',
      },
      pdfCallbackFn: this.pdfCallbackFn, // to add header and footer
    },
  }
  activitieslist: any[] = []
  allocateduserID: any
  departmentName: any
  departmentID: any
  currentTime = new Date()

  constructor(private exportAsService: ExportAsService, private snackBar: MatSnackBar,
              private fb: FormBuilder, private allocateSrvc: AllocationService,
              private router: Router, private activeRoute: ActivatedRoute, private datePipe: DatePipe) {
            this.allocateduserID = this.activeRoute.snapshot.params.userId

            this.newAllocationForm = this.fb.group({
              fname: ['', Validators.required],
              email: ['', [Validators.required, Validators.email]],
              position: ['', Validators.required],
              rolelist: this.fb.array([]),
            })
            // this.setRole()
            this.getdeptUsers()
  }

  ngOnInit() {
    this.tabsData = [
      {
        name: 'Officer',
        key: 'officer',
        render: true,
        enabled: true,
      },
      {
        name: 'Roles and activities',
        key: 'roles',
        render: true,
        enabled: true,
      },
      {
        name: 'Archived',
        key: 'archived',
        render: true,
        enabled: true,
      },
    ]

  }
  getdeptUsers() {
    this.allocateSrvc.getAllUsers().subscribe(res => {
      this.departmentName = res.deptName
      this.departmentID = res.id

      this.getAllUsers()
    })
  }

  getAllUsers() {
    const req = {
      pageNo : 0,
      pageSize : 20,
      departmentName : this.departmentName,
    }
    this.allocateSrvc.getUsers(req).subscribe(res => {
      const userslist = res.result.data
      userslist.forEach((user: any) => {
        if (this.allocateduserID === user.userDetails.wid) {
          this.selectedUser = user

          if (this.selectedUser) {
            this.newAllocationForm.patchValue({
              fname: this.selectedUser.userDetails.first_name,
              email: this.selectedUser.userDetails.email,
              position: this.selectedUser.allocationDetails.userPosition,
            })

            this.setRole()
            // const newrole = this.newAllocationForm.get('rolelist') as FormArray
            // newrole.at(0).patchValue(this.selectedUser.allocationDetails.activeList)

            this.ralist = this.selectedUser.allocationDetails.activeList
            this.archivedlist = this.selectedUser.allocationDetails.archivedList

            this.newAllocationForm.controls['fname'].disable()
            this.newAllocationForm.controls['email'].disable()
            this.newAllocationForm.controls['position'].disable()
          }
        }
      })
    })
  }

  export() {
    // download the file using old school javascript method
    this.exportAsService.save(this.config, 'WorkAllocation').subscribe(() => {
      // save started
    })
    // get the data as base64 or json object for json type - this will be helpful in ionic or SSR
    // this.exportAsService.get(this.config).subscribe(content => {
    //   console.log(content)
    // })
  }

  pdfCallbackFn (pdf: any) {
    // example to add page number as footer to every page of pdf
    const noOfPages = pdf.internal.getNumberOfPages()
    // tslint:disable-next-line:no-increment-decrement
    for (let i = 1; i <= noOfPages; i++) {
      pdf.setPage(i)
      // tslint:disable-next-line:prefer-template
      pdf.text('Page ' + i + ' of ' + noOfPages, pdf.internal.pageSize.getWidth() - 100, pdf.internal.pageSize.getHeight() - 30)
    }
  }

  onSideNavTabClick(id: string) {
    this.currentTab = id
    const el = document.getElementById(id)
    if (el != null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' })
    }
  }

  // to set roles array field
  setRole() {
    const control = <FormArray>this.newAllocationForm.controls.rolelist
    this.formdata.rolelist.forEach((x: any) => {
      control.push(this.fb.group({
        name: x.name,
        childNodes: x.childNodes,
      }))
    })
  }

  // to set new roles array field
  newRole(): FormGroup {
    return this.fb.group({
      name: new FormControl('', []),
      childNodes: new FormControl('', []),
    })
  }

  get newroleControls() {
    const rl = this.newAllocationForm.get('rolelist')
    return (<any>rl)['controls']
  }

  // to get suggested similar roles in right sidebar
  onSearchRole(event: any) {
    const val = event.target.value
    if (val.length > 2) {
      this.similarRoles = []
      this.allocateSrvc.onSearchRole(val).subscribe(res => {
        this.similarRoles = res
      })
    }
  }

  // to add the selected role to form value
  selectRole(role: any) {
    this.selectedRole = role
    this.activitieslist = this.selectedRole.childNodes
    this.similarRoles = []

    const formatselectedRole = role
    const actnodes: any[] = []
    formatselectedRole.childNodes.forEach((x: any) => {
      actnodes.push(x.name)
    })
    formatselectedRole.childNodes = actnodes
    const newrole = this.newAllocationForm.get('rolelist') as FormArray
    // newrole.push(this.newRole())
    newrole.at(0).patchValue(formatselectedRole)
  }

  // to push new obj to rolelist
  addRolesActivity(index: number) {
    if (index === 0 && this.selectedRole) {
      this.ralist.push(this.selectedRole)
      this.selectedRole = ''
      this.activitieslist = []

      const control = <FormArray>this.newAllocationForm.controls['rolelist']
      // tslint:disable-next-line:no-increment-decrement
      for (let i = control.length - 1; i >= 0; i--) {
          control.removeAt(i)
      }

      const newrolefield = this.newAllocationForm.get('rolelist') as FormArray
      newrolefield.push(this.newRole())

      this.newAllocationForm.value.rolelist = this.ralist
    } else {
      const ra = []
      ra.push(this.activitieslist)
      const nrole = {
        name: this.newAllocationForm.value.rolelist[0].name,
        childNodes: ra,
      }

      const newrole = this.newAllocationForm.get('rolelist') as FormArray
      newrole.at(0).patchValue(nrole)
      this.ralist.push(nrole)

      const control = <FormArray>this.newAllocationForm.controls['rolelist']
      // tslint:disable-next-line:no-increment-decrement
      for (let i = control.length - 1; i >= 0; i--) {
          control.removeAt(i)
      }

      const newrolefield = this.newAllocationForm.get('rolelist') as FormArray
      newrolefield.push(this.newRole())

      this.newAllocationForm.value.rolelist = this.ralist
    }
  }

  addActivity() {
    const newactivity = this.newAllocationForm.value.rolelist[0].childNodes
    this.activitieslist.push(newactivity)
  }

  buttonClick(action: string, row: any) {
    if (this.ralist) {
      if (action === 'Delete') {
        const index = this.ralist.indexOf(row)
        if (index >= 0) {
          this.ralist.splice(index, 1)
        }
      } else if (action === 'Archive') {
        const index = this.ralist.indexOf(row)
        if (index >= 0) {
          this.ralist.splice(index, 1)
        }
        row.archived = true
        row.archivedAt  =  this.datePipe.transform(this.currentTime, 'medium')
        this.archivedlist.push(row)
      }
    }
  }

  // final form submit
  onSubmit() {
    // this.ralist.forEach((r: any) => {
    //   r.isArchived = false
    // })
    // this.newAllocationForm.value.rolelist = this.ralist
    const reqdata = {
      userId: this.selectedUser.userDetails.wid,
      deptId: this.departmentID,
      deptName: this.departmentName,
      activeList: this.ralist,
      archivedList: this.archivedlist,
    }

    this.allocateSrvc.updateAllocation(reqdata).subscribe(res => {
      if (res) {
        this.openSnackbar('Work Allocation updated Successfully')
        this.newAllocationForm.reset()
        this.selectedUser = ''
        this.selectedRole = ''
        this.ralist = []
        this.archivedlist = []
        this.router.navigate(['/app/home/workallocation'])
      }
    })
  }

  private openSnackbar(primaryMsg: string, duration: number = 5000) {
    this.snackBar.open(primaryMsg, 'X', {
      duration,
    })
  }
}