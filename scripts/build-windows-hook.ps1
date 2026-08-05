param(
    [Parameter(Mandatory = $true)]
    [string] $OutputDirectory
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$upstreamRepository = "https://github.com/TodokanaiTL/subtitles.git"
$upstreamCommit = "27636f564f8b9c7f9a08b4a1a07dc714616b2ca9"
$upstreamTree = "cdb1d42bfb91f3869b1f01b96bc43b421aa655d7"

$installerRepository = "https://github.com/TodokanaiTL/WA2EnglishPatch.git"
$installerCommit = "ee7e4b7ed5814ea6746f1321a188c07d8503f4ec"
$installerTree = "8b39cff14ce726b2ae276d4a91a94b34c9bd3106"
$historicalNativeDllSha256 = "cdc8070a3bd64216b37c920a4306735f3da9a68d707bf42f6267dc4def3dbb01"
$historicalNativeDllBytes = 263168
$historicalWineDllSha256 = "49c098a07cc8fea6be6aea7d1dfd973e83d9b434144b1584591e99e189178b0f"
$historicalWineDllBytes = 243712

$dxsdkVersion = "9.29.952.8"
$dxsdkUrl = "https://api.nuget.org/v3-flatcontainer/microsoft.dxsdk.d3dx/$dxsdkVersion/microsoft.dxsdk.d3dx.$dxsdkVersion.nupkg"
$dxsdkSha256 = "ead0906ae8a26c18a7525da7490127a2110f7c58f18293738283e30e97c6ea4b"

$workDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("wa2-native-hook-" + [guid]::NewGuid().ToString("N"))
$sourceDirectory = Join-Path $workDirectory "subtitles"
$installerDirectory = Join-Path $workDirectory "WA2EnglishPatch"
$packagePath = Join-Path $workDirectory "Microsoft.DXSDK.D3DX.$dxsdkVersion.nupkg"
$packageDirectory = Join-Path $workDirectory "dxsdk-package"
$dxsdkDirectory = Join-Path $workDirectory "dxsdk-compat"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string] $FilePath,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]] $Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "'$FilePath' exited with code $LASTEXITCODE."
    }
}

New-Item -ItemType Directory -Path $workDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

try {
    Invoke-Checked git clone --quiet --no-checkout $upstreamRepository $sourceDirectory
    Invoke-Checked git -C $sourceDirectory checkout --quiet --detach $upstreamCommit

    $actualCommit = (& git -C $sourceDirectory rev-parse HEAD).Trim()
    $actualTree = (& git -C $sourceDirectory rev-parse "HEAD^{tree}").Trim()
    if ($actualCommit -ne $upstreamCommit) {
        throw "Upstream commit mismatch: expected $upstreamCommit, got $actualCommit."
    }
    if ($actualTree -ne $upstreamTree) {
        throw "Upstream tree mismatch: expected $upstreamTree, got $actualTree."
    }

    # The installer is a second authority: it documents that Todokanai shipped
    # distinct native-Windows and Wine builds, plus the exact hashes and sizes
    # of those historical binaries. Keep those claims pinned and machine-checked.
    Invoke-Checked git clone --quiet --no-checkout $installerRepository $installerDirectory
    Invoke-Checked git -C $installerDirectory checkout --quiet --detach $installerCommit

    $actualInstallerCommit = (& git -C $installerDirectory rev-parse HEAD).Trim()
    $actualInstallerTree = (& git -C $installerDirectory rev-parse "HEAD^{tree}").Trim()
    if ($actualInstallerCommit -ne $installerCommit) {
        throw "Installer commit mismatch: expected $installerCommit, got $actualInstallerCommit."
    }
    if ($actualInstallerTree -ne $installerTree) {
        throw "Installer tree mismatch: expected $installerTree, got $actualInstallerTree."
    }

    $installerDefinitionText = [System.IO.File]::ReadAllText((Join-Path $installerDirectory "src\WA2.iss"))
    $installerCodeText = [System.IO.File]::ReadAllText((Join-Path $installerDirectory "src\code.pas"))
    $installerAssertions = @(
        "#define HASH_D3D9N  `"$historicalNativeDllSha256`"",
        "#define SIZE_D3D9N  `"000$historicalNativeDllBytes`"",
        "#define HASH_D3D9O  `"$historicalWineDllSha256`"",
        "#define SIZE_D3D9O  `"000$historicalWineDllBytes`""
    )
    foreach ($assertion in $installerAssertions) {
        if (-not $installerDefinitionText.Contains($assertion)) {
            throw "Pinned installer no longer contains expected declaration: $assertion"
        }
    }
    if (-not $installerCodeText.Contains("RegKeyExists(HKCU, 'Software\Wine')")) {
        throw "Pinned installer no longer contains the native-Windows/Wine platform split."
    }
    if (
        -not $installerCodeText.Contains("DLPage.Add('{#LINK_D3D9O}', 'd3d9.dll', '{#HASH_D3D9O}')") -or
        -not $installerCodeText.Contains("DLPage.Add('{#LINK_D3D9N}', 'd3d9.dll', '{#HASH_D3D9N}')")
    ) {
        throw "Pinned installer no longer selects the expected platform-specific DLLs."
    }

    Invoke-WebRequest -Uri $dxsdkUrl -OutFile $packagePath
    $actualDxsdkSha256 = (Get-FileHash -Algorithm SHA256 $packagePath).Hash.ToLowerInvariant()
    if ($actualDxsdkSha256 -ne $dxsdkSha256) {
        throw "D3DX package mismatch: expected $dxsdkSha256, got $actualDxsdkSha256."
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($packagePath, $packageDirectory)

    New-Item -ItemType Directory -Path (Join-Path $dxsdkDirectory "Include") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $dxsdkDirectory "Lib\x86") -Force | Out-Null
    Copy-Item -Path (Join-Path $packageDirectory "build\native\include\*") -Destination (Join-Path $dxsdkDirectory "Include") -Recurse
    Copy-Item -Path (Join-Path $packageDirectory "build\native\release\lib\x86\*") -Destination (Join-Path $dxsdkDirectory "Lib\x86") -Recurse

    # Upstream's checked-in Release configuration still defines _TTL_DEBUG,
    # which draws the author's diagnostic HUD every frame. Todokanai's
    # distributed release DLL does not contain those debug strings, so the
    # production build removes this one build-only define.
    $projectPath = Join-Path $sourceDirectory "wa2\wa2.vcxproj"
    $projectOriginalSha256 = (Get-FileHash -Algorithm SHA256 $projectPath).Hash.ToLowerInvariant()
    $projectText = [System.IO.File]::ReadAllText($projectPath)
    $debugNeedle = ";_TTL_DEBUG</PreprocessorDefinitions>"
    $debugNeedleCount = ([regex]::Matches($projectText, [regex]::Escape($debugNeedle))).Count
    if ($debugNeedleCount -ne 1) {
        throw "Expected exactly one _TTL_DEBUG Release define, found $debugNeedleCount."
    }
    $projectText = $projectText.Replace($debugNeedle, "</PreprocessorDefinitions>")

    # The upstream Release|Win32 linker configuration also emits a PDB. Its
    # absolute temporary path and GUID make otherwise identical DLLs differ.
    # Disable release debug information so clean builds are hash-reproducible
    # and contain no runner-specific path.
    $releaseDebugPattern = "(<GenerateDebugInformation>)true(</GenerateDebugInformation>\s*<EnableUAC>false</EnableUAC>\s*<AdditionalDependencies>d3dx9\.lib;)"
    $releaseDebugMatchCount = ([regex]::Matches($projectText, $releaseDebugPattern)).Count
    if ($releaseDebugMatchCount -ne 1) {
        throw "Expected exactly one Release|Win32 debug-information setting, found $releaseDebugMatchCount."
    }
    $projectText = [regex]::Replace($projectText, $releaseDebugPattern, '${1}false${2}')

    # Normalize the PE timestamp and other linker-generated build identity so
    # two clean builds from identical pinned inputs produce the same DLL.
    $breproNeedle = "<AdditionalOptions>/EXPORT:Direct3DCreate9=_Direct3DCreate9Hook@4 %(AdditionalOptions)</AdditionalOptions>"
    $breproNeedleCount = ([regex]::Matches($projectText, [regex]::Escape($breproNeedle))).Count
    if ($breproNeedleCount -ne 1) {
        throw "Expected exactly one Release|Win32 linker-options element, found $breproNeedleCount."
    }
    $projectText = $projectText.Replace(
        $breproNeedle,
        "<AdditionalOptions>/Brepro /EXPORT:Direct3DCreate9=_Direct3DCreate9Hook@4 %(AdditionalOptions)</AdditionalOptions>"
    )

    [System.IO.File]::WriteAllText(
        $projectPath,
        $projectText,
        [System.Text.UTF8Encoding]::new($false)
    )
    $projectPatchedSha256 = (Get-FileHash -Algorithm SHA256 $projectPath).Hash.ToLowerInvariant()

    $vswherePath = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswherePath)) {
        throw "Could not find vswhere.exe."
    }

    $visualStudioPath = (& $vswherePath -latest -products * -requires Microsoft.Component.MSBuild -property installationPath).Trim()
    if (-not $visualStudioPath) {
        throw "Could not locate Visual Studio with MSBuild."
    }

    $msbuildPath = Join-Path $visualStudioPath "MSBuild\Current\Bin\MSBuild.exe"
    if (-not (Test-Path $msbuildPath)) {
        throw "Could not find MSBuild at '$msbuildPath'."
    }
    $msbuildVersionOutput = & $msbuildPath -version -nologo 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "MSBuild version query exited with code $LASTEXITCODE."
    }
    $msbuildVersion = ($msbuildVersionOutput | Out-String).Trim()

    $solutionPath = Join-Path $sourceDirectory "wa2.sln"
    $dxsdkProperty = $dxsdkDirectory.TrimEnd("\") + "\"
    Invoke-Checked $msbuildPath `
        $solutionPath `
        "/m" `
        "/restore:false" `
        "/p:Configuration=Release" `
        "/p:Platform=x86" `
        "/p:DXSDK_DIR=$dxsdkProperty"

    $dllCandidates = @(
        Get-ChildItem -Path $sourceDirectory -Filter "d3d9.dll" -File -Recurse
    )
    if ($dllCandidates.Count -ne 1) {
        throw "Expected exactly one built d3d9.dll, found $($dllCandidates.Count)."
    }
    $builtDll = $dllCandidates[0].FullName

    $dumpbinCandidates = @(
        Get-ChildItem -Path (Join-Path $visualStudioPath "VC\Tools\MSVC") -Filter "dumpbin.exe" -File -Recurse |
            Where-Object { $_.FullName -match "[\\/]Hostx64[\\/]x86[\\/]dumpbin\.exe$" } |
            Sort-Object FullName -Descending
    )
    if ($dumpbinCandidates.Count -lt 1) {
        throw "Could not locate an x86-targeting dumpbin.exe."
    }
    $dumpbinPath = $dumpbinCandidates[0].FullName

    $headersOutput = & $dumpbinPath /headers $builtDll 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "dumpbin /headers exited with code $LASTEXITCODE."
    }
    $headers = ($headersOutput | Out-String)

    $exportsOutput = & $dumpbinPath /exports $builtDll 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "dumpbin /exports exited with code $LASTEXITCODE."
    }
    $exports = ($exportsOutput | Out-String)

    $dependentsOutput = & $dumpbinPath /dependents $builtDll 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "dumpbin /dependents exited with code $LASTEXITCODE."
    }
    $dependents = ($dependentsOutput | Out-String)

    if ($headers -notmatch "(?im)\b14C machine \(x86\)") {
        throw "The built hook is not a 32-bit x86 PE DLL."
    }
    if ($exports -notmatch "(?im)\bDirect3DCreate9\b") {
        throw "The built hook does not export Direct3DCreate9."
    }
    if ($dependents -notmatch "(?im)\bD3DX9_43\.dll\b") {
        throw "The built hook does not import the expected D3DX9_43.dll runtime."
    }
    if ($dependents -match "(?im)\b(?:VCRUNTIME|MSVCP|MSVCR)[^\s]*\.dll\b|\bucrtbase\.dll\b|\bapi-ms-win-crt-[^\s]*\.dll\b") {
        throw "The built hook unexpectedly depends on a dynamic Visual C++ runtime."
    }

    $dependencyNames = @(
        [regex]::Matches($dependents, "(?im)^\s+([A-Za-z0-9_.-]+\.dll)\s*$") |
            ForEach-Object { $_.Groups[1].Value.ToUpperInvariant() }
    )
    $expectedDependencyNames = @("D3DX9_43.DLL", "KERNEL32.DLL", "USER32.DLL")
    $dependencyDifference = @(
        Compare-Object -ReferenceObject $expectedDependencyNames -DifferenceObject $dependencyNames
    )
    if ($dependencyDifference.Count -ne 0) {
        throw "Unexpected hook dependencies: $($dependencyDifference | Out-String)"
    }

    $binaryText = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($builtDll))
    if ($binaryText.Contains("Last Loaded Audio ID")) {
        throw "The production hook still contains the _TTL_DEBUG overlay."
    }
    if ($binaryText.Contains(".pdb") -or $binaryText.Contains("runneradmin") -or $binaryText.Contains("wa2-native-hook-")) {
        throw "The production hook still contains release-debug or runner-specific paths."
    }

    $outputDll = Join-Path $OutputDirectory "d3d9.dll"
    Copy-Item -Path $builtDll -Destination $outputDll -Force
    Copy-Item -Path (Join-Path $sourceDirectory "LICENSE") -Destination (Join-Path $OutputDirectory "TodokanaiTL-subtitles-LICENSE.txt") -Force

    [System.IO.File]::WriteAllText(
        (Join-Path $OutputDirectory "dumpbin-headers.txt"),
        $headers,
        [System.Text.UTF8Encoding]::new($false)
    )
    [System.IO.File]::WriteAllText(
        (Join-Path $OutputDirectory "dumpbin-exports.txt"),
        $exports,
        [System.Text.UTF8Encoding]::new($false)
    )
    [System.IO.File]::WriteAllText(
        (Join-Path $OutputDirectory "dumpbin-dependents.txt"),
        $dependents,
        [System.Text.UTF8Encoding]::new($false)
    )

    $dllItem = Get-Item $outputDll
    $dllSha256 = (Get-FileHash -Algorithm SHA256 $outputDll).Hash.ToLowerInvariant()
    $provenance = [ordered]@{
        schema_version = 1
        artifact = [ordered]@{
            filename = "d3d9.dll"
            sha256 = $dllSha256
            bytes = $dllItem.Length
            architecture = "x86"
            required_export = "Direct3DCreate9"
            runtime_import = "D3DX9_43.dll"
        }
        subtitle_hook_source = [ordered]@{
            repository = $upstreamRepository
            commit = $upstreamCommit
            tree = $upstreamTree
            license = "MIT"
        }
        installer_reference = [ordered]@{
            repository = $installerRepository
            commit = $installerCommit
            tree = $installerTree
            license = "BSD-3-Clause"
            platform_detection = "HKCU\Software\Wine"
            native_windows_historical_dll = [ordered]@{
                sha256 = $historicalNativeDllSha256
                bytes = $historicalNativeDllBytes
            }
            wine_historical_dll = [ordered]@{
                sha256 = $historicalWineDllSha256
                bytes = $historicalWineDllBytes
            }
        }
        build_adjustment = [ordered]@{
            kind = "release-configuration-only"
            description = "Removed the checked-in _TTL_DEBUG define, disabled Release|Win32 linker debug information, and enabled /Brepro. C++ and header source files are unchanged."
            files_changed = @("wa2/wa2.vcxproj")
            project_sha256_before = $projectOriginalSha256
            project_sha256_after = $projectPatchedSha256
            exact_changes = @(
                "Removed ;_TTL_DEBUG from the Release|Win32 PreprocessorDefinitions element.",
                "Changed Release|Win32 GenerateDebugInformation from true to false.",
                "Added /Brepro to the Release|Win32 linker options."
            )
        }
        dependency = [ordered]@{
            package = "Microsoft.DXSDK.D3DX"
            version = $dxsdkVersion
            url = $dxsdkUrl
            sha256 = $dxsdkSha256
            use = "Headers and x86 import library for the legacy D3DX9 API."
        }
        toolchain = [ordered]@{
            runner_image_os = [System.Environment]::GetEnvironmentVariable("ImageOS")
            runner_image_version = [System.Environment]::GetEnvironmentVariable("ImageVersion")
            visual_studio = $visualStudioPath
            msbuild = $msbuildPath
            msbuild_version = $msbuildVersion
            dumpbin = $dumpbinPath
            dumpbin_file_version = (Get-Item $dumpbinPath).VersionInfo.FileVersion
            windows_sdk_target = "10.0.22621.0"
            configuration = "Release"
            platform = "x86"
            runtime_library = "MultiThreaded"
        }
        validation = [ordered]@{
            pe_machine = "14C (x86)"
            direct3dcreate9_export_present = $true
            d3dx9_43_import_present = $true
            dynamic_vc_runtime_absent = $true
            debug_overlay_string_absent = $true
            release_debug_paths_absent = $true
            exact_dependencies = $dependencyNames
        }
        generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        github_run = [ordered]@{
            repository = $env:GITHUB_REPOSITORY
            run_id = $env:GITHUB_RUN_ID
            run_attempt = $env:GITHUB_RUN_ATTEMPT
            workflow_sha = $env:GITHUB_SHA
        }
    }
    $provenance |
        ConvertTo-Json -Depth 8 |
        Set-Content -Path (Join-Path $OutputDirectory "build-provenance.json") -Encoding utf8

    Write-Host "Built native Windows hook: $outputDll"
    Write-Host "SHA-256: $dllSha256"
}
finally {
    if (Test-Path $workDirectory) {
        Remove-Item -Path $workDirectory -Recurse -Force
    }
}
