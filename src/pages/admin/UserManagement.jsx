import { useEffect, useState } from "react";

import DepartmentManagementSection from "../../components/admin/user-management/DepartmentManagementSection";
import EmployeeAccountForm from "../../components/admin/user-management/EmployeeAccountForm";
import CreatedAccountNotice from "../../components/admin/user-management/CreatedAccountNotice";
import UserDirectorySection from "../../components/admin/user-management/UserDirectorySection";
import EditUserDialog from "../../components/admin/user-management/EditUserDialog";
import { EMPTY_FORM, employeeCode } from "../../components/admin/user-management/userManagementConstants";
import { Stat } from "../../components/admin/user-management/UserManagementUi";

import Sidebar from "../../components/Sidebar";

import TopBar from "../../components/TopBar";

import {
  createEmployeeAccount,
  deleteUserAccount,
  listTeams,
  listUsers,
  resetUserPassword,
  updateUserAccount,
} from "../../services/userService";

import { useSidebarState } from "../../hooks/useSidebarState";

import { useAuth } from "../../hooks/useAuth";

import { useDepartments } from "../../hooks/useDepartments";

import { createDepartment, renameDepartment, setDepartmentActive } from "../../services/departmentService";

import { useProfiles } from "../../hooks/useProfiles";



export default function UserManagement() {
  const { collapsed } = useSidebarState();

  const { user: currentUser } = useAuth();

  const { departments, allDepartments } = useDepartments();

  const { profiles } = useProfiles();

  const [users, setUsers] = useState([]);

  const [teams, setTeams] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [newDepartmentName, setNewDepartmentName] = useState("");

  const [departmentError, setDepartmentError] = useState("");

  const [editingDepartmentId, setEditingDepartmentId] = useState(null);

  const [editingDepartmentName, setEditingDepartmentName] = useState("");

  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");

  const [credentials, setCredentials] = useState(null); // { email, employeeId, temporaryPassword }

  const [copied, setCopied] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [roleFilter, setRoleFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  const [editingUser, setEditingUser] = useState(null);

  const [editForm, setEditForm] = useState({
    displayName: "",

    email: "",

    departmentId: "",

    employeeId: "",

    jobTitle: "",

    employmentType: "full_time",

    hireDate: "",
  });

  const [savingEdit, setSavingEdit] = useState(false);

  const [resettingPassword, setResettingPassword] = useState(false);

  const [temporaryCredential, setTemporaryCredential] = useState(null);

  const [deletingUserId, setDeletingUserId] = useState(null);

  const [directoryError, setDirectoryError] = useState("");

  async function reload() {
    const [userList, teamList] = await Promise.all([listUsers(), listTeams()]);

    setUsers(userList);

    setTeams(teamList);
  }

  useEffect(() => {
    let active = true;

    Promise.all([listUsers(), listTeams()])

      .then(([userList, teamList]) => {
        if (active) {
          setUsers(userList);

          setTeams(teamList);
        }
      })

      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(dayId) {
    setForm((prev) => ({
      ...prev,

      days: prev.days.includes(dayId) ? prev.days.filter((d) => d !== dayId) : [...prev.days, dayId],
    }));
  }

  async function handleCreateDepartment(e) {
    e.preventDefault();

    setDepartmentError("");

    try {
      const department = await createDepartment(newDepartmentName);

      setNewDepartmentName("");

      updateField("departmentId", department.id);
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo agregar el departamento.");
    }
  }

  async function handleRenameDepartment(e) {
    e.preventDefault();

    setDepartmentError("");

    try {
      await renameDepartment(editingDepartmentId, editingDepartmentName);

      setEditingDepartmentId(null);

      setEditingDepartmentName("");
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo actualizar el departamento.");
    }
  }

  async function handleToggleDepartment(department) {
    const willDeactivate = department.active !== false;

    if (
      willDeactivate &&
      !window.confirm(
        `¿Desactivar el departamento "${department.name}"? Se conservará su historial y no estará disponible para nuevas cuentas o encuestas.`,
      )
    )
      return;

    setDepartmentError("");

    try {
      await setDepartmentActive(department.id, !willDeactivate);

      if (willDeactivate && form.departmentId === department.id) {
        updateField("departmentId", "");
      }
    } catch (err) {
      setDepartmentError(err?.message || "No se pudo cambiar el estado del departamento.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();

    setError("");

    setCreating(true);

    try {
      const result = await createEmployeeAccount({
        displayName: form.displayName.trim(),

        email: form.email.trim(),

        employeeId: form.employeeId.trim(),

        jobTitle: form.jobTitle.trim(),

        employmentType: form.employmentType,

        hireDate: form.hireDate || null,

        role: form.role,

        departmentId: form.departmentId,

        teamId: form.teamId || null,

        workSchedule: {
          days: form.days,

          startTime: form.startTime,

          endTime: form.endTime,

          timezone: "America/Hermosillo",
        },
      });

      setCredentials({
        email: form.email.trim(),

        employeeId: result.employeeId,

        temporaryPassword: result.temporaryPassword,
      });

      setCopied(false);

      setForm(EMPTY_FORM);

      await reload();
    } catch (err) {
      setError(err?.message || "No se pudo crear la cuenta.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(credentials.temporaryPassword);

    setCopied(true);
  }

  async function handleToggleActive(user) {
    await updateUserAccount(user.id, { active: user.active === false });

    await reload();
  }

  function openEditUser(user) {
    setEditingUser(user);

    setEditForm({
      displayName: user.displayName || "",

      email: user.email || "",

      departmentId: user.departmentId || "",

      employeeId: user.employeeId || employeeCode(user),

      jobTitle: user.jobTitle || "",

      employmentType: user.employmentType || "full_time",

      hireDate: user.hireDate || "",
    });

    setTemporaryCredential(null);

    setDirectoryError("");
  }

  async function handleSaveUser(e) {
    e.preventDefault();

    if (!editingUser) return;

    setSavingEdit(true);

    setDirectoryError("");

    try {
      await updateUserAccount(editingUser.id, {
        displayName: editForm.displayName.trim(),

        email: editForm.email.trim(),

        departmentId: editForm.departmentId || null,

        employeeId: editForm.employeeId.trim(),

        jobTitle: editForm.jobTitle.trim(),

        employmentType: editForm.employmentType,

        hireDate: editForm.hireDate || null,
      });

      await reload();

      setEditingUser(null);
    } catch (err) {
      setDirectoryError(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetPassword(user = editingUser) {
    if (!user) return;

    setResettingPassword(true);

    setDirectoryError("");

    setTemporaryCredential(null);

    try {
      const result = await resetUserPassword(user.id);

      setTemporaryCredential({
        email: user.id === editingUser?.id ? editForm.email : user.email || "",

        password: result.temporaryPassword,
      });
    } catch (err) {
      setDirectoryError(err?.message || "No se pudo generar una contraseña temporal.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleDeleteUser(user) {
    if (user.id === currentUser?.uid) {
      setDirectoryError("No puedes eliminar la cuenta con la que iniciaste sesión.");

      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar permanentemente la cuenta de ${user.displayName || user.email}? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeletingUserId(user.id);

    setDirectoryError("");

    try {
      await deleteUserAccount(user.id);

      setUsers((previous) => previous.filter((item) => item.id !== user.id));
    } catch (err) {
      setDirectoryError(err?.message || "No se pudo eliminar la cuenta.");
    } finally {
      setDeletingUserId(null);
    }
  }

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("es");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !normalizedSearch ||
      `${user.displayName || ""} ${user.email || ""} ${user.employeeId || ""} ${user.jobTitle || ""}`

        .toLocaleLowerCase("es")

        .includes(normalizedSearch);

    const matchesDepartment = departmentFilter === "all" || user.departmentId === departmentFilter;

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? user.active !== false : user.active === false);

    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.active !== false).length;

  const employeeUsers = users.filter((user) => user.role === "employee" && user.active !== false);

  const monthStart = new Date();

  const monthStartIso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;

  const todayIso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(monthStart.getDate()).padStart(2, "0")}`;

  const newHiresThisMonth = employeeUsers.filter(
    (user) => user.hireDate && user.hireDate >= monthStartIso && user.hireDate <= todayIso,
  ).length;

  const departmentDistribution = departments

    .map((department) => ({
      id: department.id,

      name: department.name,

      count: employeeUsers.filter((user) => user.departmentId === department.id).length,
    }))

    .filter((department) => department.count > 0);

  const unassignedCount = employeeUsers.filter((user) => !user.departmentId).length;

  if (unassignedCount > 0) {
    departmentDistribution.push({ id: "unassigned", name: "Sin departamento", count: unassignedCount });
  }

  const totalDepartmentEmployees = departmentDistribution.reduce((total, department) => total + department.count, 0);

  const hasFilters = searchTerm || departmentFilter !== "all" || roleFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearchTerm("");

    setDepartmentFilter("all");

    setRoleFilter("all");

    setStatusFilter("all");
  }

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />

      <TopBar />

      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Encabezado + resumen */}

          <div className="flex flex-wrap items-end justify-between gap-space-md animate-enter">
            <div>
              <h1 className="text-headline-xl text-on-surface tracking-tight">Gestión de usuarios</h1>

              <p className="text-body-md text-on-surface-variant mt-1 max-w-prose">
                Solo la administración puede crear cuentas. Comparte la contraseña temporal con el colaborador.
              </p>
            </div>

            <div className="flex flex-wrap gap-space-sm">
              <Stat label="Colaboradores" value={employeeUsers.length} />

              <Stat label="Nuevos este mes" value={newHiresThisMonth} />

              <Stat label="Activas" value={activeCount} />

              <Stat label="Departamentos" value={departments.length} />
            </div>
          </div>

          {/* Distribución y gestión de departamentos */}
          <DepartmentManagementSection
            allDepartments={allDepartments}
            departmentDistribution={departmentDistribution}
            totalDepartmentEmployees={totalDepartmentEmployees}
            unassignedCount={unassignedCount}
            newDepartmentName={newDepartmentName}
            setNewDepartmentName={setNewDepartmentName}
            handleCreateDepartment={handleCreateDepartment}
            departmentError={departmentError}
            setDepartmentError={setDepartmentError}
            editingDepartmentId={editingDepartmentId}
            editingDepartmentName={editingDepartmentName}
            setEditingDepartmentId={setEditingDepartmentId}
            setEditingDepartmentName={setEditingDepartmentName}
            handleRenameDepartment={handleRenameDepartment}
            handleToggleDepartment={handleToggleDepartment}
          />

          <EmployeeAccountForm
            form={form}
            updateField={updateField}
            handleCreate={handleCreate}
            creating={creating}
            departments={departments}
            teams={teams}
            toggleDay={toggleDay}
            error={error}
          />

          <CreatedAccountNotice
            credentials={credentials}
            copied={copied}
            handleCopy={handleCopy}
          />

          <UserDirectorySection
            filteredUsers={filteredUsers}
            users={users}
            hasFilters={hasFilters}
            clearFilters={clearFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            allDepartments={allDepartments}
            directoryError={directoryError}
            currentUser={currentUser}
            profiles={profiles}
            openEditUser={openEditUser}
            handleToggleActive={handleToggleActive}
            handleResetPassword={handleResetPassword}
            handleDeleteUser={handleDeleteUser}
            deletingUserId={deletingUserId}
          />

          <EditUserDialog
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            editForm={editForm}
            setEditForm={setEditForm}
            handleSaveUser={handleSaveUser}
            allDepartments={allDepartments}
            handleResetPassword={handleResetPassword}
            resettingPassword={resettingPassword}
            temporaryCredential={temporaryCredential}
            directoryError={directoryError}
            savingEdit={savingEdit}
          />

        </div>
      </main>
    </div>
  );
}
